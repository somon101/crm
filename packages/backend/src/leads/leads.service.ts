import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/types';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';

const LEAD_INCLUDE = {
  source: true,
  status: true,
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  interestedTariff: true,
  purchasedTariff: true,
  lossReason: true,
  vehicleInterest: true,
} satisfies Prisma.LeadInclude;

export type LeadWithRelations = Prisma.LeadGetPayload<{ include: typeof LEAD_INCLUDE }>;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** MANAGER is always scoped to their own leads at the query level — never trust a
   * client-supplied managerId for this. This is what actually prevents IDOR, not
   * just the controller-level role guard. */
  private ownershipWhere(user: AuthenticatedUser): Prisma.LeadWhereInput {
    return user.role === Role.MANAGER ? { managerId: user.id } : {};
  }

  private buildWhere(user: AuthenticatedUser, query: QueryLeadsDto): Prisma.LeadWhereInput {
    const and: Prisma.LeadWhereInput[] = [{ deletedAt: null }, this.ownershipWhere(user)];

    if (user.role === Role.ADMIN && query.managerId) {
      and.push({ managerId: query.managerId });
    }
    if (query.search) {
      const term = query.search.trim();
      and.push({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { vehicleInterest: { make: { contains: term, mode: 'insensitive' } } },
          { vehicleInterest: { model: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }
    if (query.statusId) and.push({ statusId: query.statusId });
    if (query.temperature) and.push({ temperature: query.temperature });
    if (query.sourceId) and.push({ sourceId: query.sourceId });
    if (query.tariffId) {
      and.push({
        OR: [{ interestedTariffId: query.tariffId }, { purchasedTariffId: query.tariffId }],
      });
    }
    if (query.createdFrom || query.createdTo) {
      and.push({
        createdAt: {
          ...(query.createdFrom && { gte: query.createdFrom }),
          ...(query.createdTo && { lte: query.createdTo }),
        },
      });
    }
    if (query.nextContactFrom || query.nextContactTo) {
      and.push({
        tasks: {
          some: {
            status: 'PENDING',
            dueAt: {
              ...(query.nextContactFrom && { gte: query.nextContactFrom }),
              ...(query.nextContactTo && { lte: query.nextContactTo }),
            },
          },
        },
      });
    }
    if (query.result === 'BOUGHT') and.push({ status: { isWon: true } });
    if (query.result === 'NOT_BOUGHT') and.push({ status: { isLost: true } });
    if (query.result === 'IN_PROGRESS') and.push({ status: { isWon: false, isLost: false } });

    return { AND: and };
  }

  async findAll(user: AuthenticatedUser, query: QueryLeadsDto) {
    const where = this.buildWhere(user, query);
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }

  /** Returns 404 (never 403) when the lead exists but belongs to another manager —
   * this avoids confirming to a manager that another manager's lead ID even exists. */
  async findOneOrThrow(id: string, user: AuthenticatedUser): Promise<LeadWithRelations> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...this.ownershipWhere(user) },
      include: LEAD_INCLUDE,
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  private async resolveDefaultStatusId(): Promise<string> {
    const status = await this.prisma.leadStatus.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!status) {
      throw new BadRequestException('No default lead status is configured');
    }
    return status.id;
  }

  async create(dto: CreateLeadDto, user: AuthenticatedUser): Promise<LeadWithRelations> {
    const managerId = user.role === Role.MANAGER ? user.id : (dto.managerId ?? null);
    const statusId = dto.statusId ?? (await this.resolveDefaultStatusId());

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          messengerType: dto.messengerType,
          messengerContact: dto.messengerContact,
          additionalContactInfo: dto.additionalContactInfo,
          firstContactDate: dto.firstContactDate,
          sourceId: dto.sourceId,
          managerId,
          statusId,
          temperature: dto.temperature,
          contactReason: dto.contactReason,
          managerNotes: dto.managerNotes,
          interestedTariffId: dto.interestedTariffId,
          plannedPurchasePeriodText: dto.plannedPurchasePeriodText,
          plannedPurchaseDate: dto.plannedPurchaseDate,
          plannedPurchaseComment: dto.plannedPurchaseComment,
        },
      });

      if (dto.vehicleInterest) {
        await tx.vehicleInterest.create({
          data: { leadId: created.id, ...dto.vehicleInterest },
        });
      }

      await this.auditService.record({
        entityType: 'Lead',
        entityId: created.id,
        leadId: created.id,
        action: AuditAction.CREATE,
        changes: {
          firstName: { old: null, new: created.firstName },
          lastName: { old: null, new: created.lastName },
          phone: { old: null, new: created.phone },
        },
        changedByUserId: user.id,
        tx,
      });

      return created;
    });

    return this.findOneOrThrow(lead.id, user);
  }

  private assertResultIsComplete(merged: {
    statusIsWon: boolean;
    statusIsLost: boolean;
    purchasedTariffId?: string | null;
    purchasePrice?: Prisma.Decimal | number | null;
    purchaseDate?: Date | null;
    lossReasonId?: string | null;
  }) {
    if (merged.statusIsWon) {
      const missing: string[] = [];
      if (!merged.purchasedTariffId) missing.push('purchasedTariffId');
      if (merged.purchasePrice === null || merged.purchasePrice === undefined)
        missing.push('purchasePrice');
      if (!merged.purchaseDate) missing.push('purchaseDate');
      if (missing.length > 0) {
        throw new BadRequestException(
          `Cannot move to a "won" status without: ${missing.join(', ')}`,
        );
      }
    }
    if (merged.statusIsLost && !merged.lossReasonId) {
      throw new BadRequestException('Cannot move to a "lost" status without a lossReasonId');
    }
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    user: AuthenticatedUser,
  ): Promise<LeadWithRelations> {
    const before = await this.findOneOrThrow(id, user);

    const nextStatusId = dto.statusId ?? before.statusId;
    const nextStatus =
      dto.statusId && dto.statusId !== before.statusId
        ? await this.prisma.leadStatus.findUnique({ where: { id: nextStatusId } })
        : before.status;
    if (!nextStatus) {
      throw new BadRequestException('Unknown statusId');
    }

    this.assertResultIsComplete({
      statusIsWon: nextStatus.isWon,
      statusIsLost: nextStatus.isLost,
      purchasedTariffId: dto.purchasedTariffId ?? before.purchasedTariffId,
      purchasePrice: dto.purchasePrice ?? before.purchasePrice,
      purchaseDate: dto.purchaseDate ?? before.purchaseDate,
      lossReasonId: dto.lossReasonId ?? before.lossReasonId,
    });

    const { version, vehicleInterest, ...scalarDto } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.lead.updateMany({
        where: { id, version, ...this.ownershipWhere(user) },
        data: {
          ...scalarDto,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      if (vehicleInterest) {
        if (before.vehicleInterest) {
          await tx.vehicleInterest.update({
            where: { leadId: id },
            data: vehicleInterest,
          });
        } else {
          if (!vehicleInterest.interestType) {
            throw new BadRequestException('interestType is required to create a vehicle interest');
          }
          await tx.vehicleInterest.create({
            data: {
              leadId: id,
              interestType: vehicleInterest.interestType,
              make: vehicleInterest.make,
              model: vehicleInterest.model,
              year: vehicleInterest.year,
              budget: vehicleInterest.budget,
              comment: vehicleInterest.comment,
            },
          });
        }
      }

      // Planned purchase date changed: invalidate any pending auto-generated
      // reminder tied to the old date so the reminder cron regenerates it for the
      // new date instead of leaving a stale task behind.
      if (
        dto.plannedPurchaseDate !== undefined &&
        dto.plannedPurchaseDate?.getTime() !== before.plannedPurchaseDate?.getTime()
      ) {
        await tx.task.updateMany({
          where: { leadId: id, isAutoGenerated: true, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }

      const changes = this.auditService.buildDiff(
        before as unknown as Record<string, unknown>,
        scalarDto as Record<string, unknown>,
      );
      if (vehicleInterest) {
        changes.vehicleInterest = { old: before.vehicleInterest ?? null, new: vehicleInterest };
      }

      await this.auditService.record({
        entityType: 'Lead',
        entityId: id,
        leadId: id,
        action:
          dto.statusId && dto.statusId !== before.statusId
            ? AuditAction.STATUS_CHANGE
            : AuditAction.UPDATE,
        changes,
        changedByUserId: user.id,
        tx,
      });

      return true;
    });

    if (result === null) {
      const current = await this.findOneOrThrow(id, user);
      throw new ConflictException({
        message: 'This lead was modified by someone else. Refresh and try again.',
        currentRecord: current,
      });
    }

    return this.findOneOrThrow(id, user);
  }

  /** Admin-only (enforced by controller @Roles guard). Bumps `version` so any
   * in-flight edit by the previous manager surfaces as a 409 instead of silently
   * landing on the wrong owner. */
  async reassign(id: string, dto: ReassignLeadDto, actorId: string): Promise<LeadWithRelations> {
    const before = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!before) {
      throw new NotFoundException('Lead not found');
    }
    await this.prisma.lead.update({
      where: { id },
      data: { managerId: dto.managerId, version: { increment: 1 } },
    });
    await this.auditService.record({
      entityType: 'Lead',
      entityId: id,
      leadId: id,
      action: AuditAction.REASSIGN,
      changes: { managerId: { old: before.managerId, new: dto.managerId } },
      changedByUserId: actorId,
    });
    return this.prisma.lead.findUniqueOrThrow({ where: { id }, include: LEAD_INCLUDE });
  }

  /** Admin-only. Soft delete: history (Interaction/AuditLog rows) is never touched. */
  async softDelete(id: string, actorId: string): Promise<void> {
    const before = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!before) {
      throw new NotFoundException('Lead not found');
    }
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.record({
      entityType: 'Lead',
      entityId: id,
      leadId: id,
      action: AuditAction.DELETE,
      changes: {},
      changedByUserId: actorId,
    });
  }

  async getTimeline(id: string, user: AuthenticatedUser) {
    await this.findOneOrThrow(id, user); // ownership + existence check

    const [interactions, auditEntries] = await Promise.all([
      this.prisma.interaction.findMany({
        where: { leadId: id },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { leadId: id },
        include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const timeline = [
      ...interactions.map((i) => ({
        kind: 'INTERACTION' as const,
        at: i.occurredAt,
        id: i.id,
        type: i.type,
        comment: i.comment,
        author: i.author,
      })),
      ...auditEntries.map((a) => ({
        kind: 'AUDIT' as const,
        at: a.createdAt,
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        changes: a.changes,
        author: a.changedBy,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return timeline;
  }
}
