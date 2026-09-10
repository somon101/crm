import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadStatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.leadStatus.findMany({ orderBy: { order: 'asc' } });
  }

  async findByIdOrThrow(id: string) {
    const status = await this.prisma.leadStatus.findUnique({ where: { id } });
    if (!status) {
      throw new NotFoundException('Lead status not found');
    }
    return status;
  }

  private assertNotContradictory(isWon?: boolean, isLost?: boolean) {
    if (isWon && isLost) {
      throw new BadRequestException('A status cannot be both isWon and isLost');
    }
  }

  async create(dto: CreateLeadStatusDto, actorId: string) {
    this.assertNotContradictory(dto.isWon, dto.isLost);
    const status = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.leadStatus.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.leadStatus.create({ data: dto });
    });
    await this.auditService.record({
      entityType: 'LeadStatus',
      entityId: status.id,
      action: AuditAction.CREATE,
      changes: { name: { old: null, new: status.name } },
      changedByUserId: actorId,
    });
    return status;
  }

  async update(id: string, dto: UpdateLeadStatusDto, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    this.assertNotContradictory(dto.isWon ?? before.isWon, dto.isLost ?? before.isLost);

    const status = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.leadStatus.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.leadStatus.update({ where: { id }, data: dto });
    });

    await this.auditService.record({
      entityType: 'LeadStatus',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, dto as Record<string, unknown>),
      changedByUserId: actorId,
    });
    return status;
  }

  private async setActive(id: string, isActive: boolean, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    if (!isActive && before.isDefault) {
      throw new BadRequestException(
        'Cannot deactivate the default status — set another status as default first',
      );
    }
    const status = await this.prisma.leadStatus.update({ where: { id }, data: { isActive } });
    await this.auditService.record({
      entityType: 'LeadStatus',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive }),
      changedByUserId: actorId,
    });
    return status;
  }

  deactivate(id: string, actorId: string) {
    return this.setActive(id, false, actorId);
  }

  activate(id: string, actorId: string) {
    return this.setActive(id, true, actorId);
  }
}
