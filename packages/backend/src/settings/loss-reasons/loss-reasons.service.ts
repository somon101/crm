import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Injectable()
export class LossReasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.lossReason.findMany({ orderBy: { order: 'asc' } });
  }

  async findByIdOrThrow(id: string) {
    const reason = await this.prisma.lossReason.findUnique({ where: { id } });
    if (!reason) {
      throw new NotFoundException('Loss reason not found');
    }
    return reason;
  }

  async create(dto: CreateLossReasonDto, actorId: string) {
    const reason = await this.prisma.lossReason.create({ data: dto });
    await this.auditService.record({
      entityType: 'LossReason',
      entityId: reason.id,
      action: AuditAction.CREATE,
      changes: { name: { old: null, new: reason.name } },
      changedByUserId: actorId,
    });
    return reason;
  }

  async update(id: string, dto: UpdateLossReasonDto, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const reason = await this.prisma.lossReason.update({ where: { id }, data: dto });
    await this.auditService.record({
      entityType: 'LossReason',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, dto as Record<string, unknown>),
      changedByUserId: actorId,
    });
    return reason;
  }

  private async setActive(id: string, isActive: boolean, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const reason = await this.prisma.lossReason.update({ where: { id }, data: { isActive } });
    await this.auditService.record({
      entityType: 'LossReason',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive }),
      changedByUserId: actorId,
    });
    return reason;
  }

  deactivate(id: string, actorId: string) {
    return this.setActive(id, false, actorId);
  }

  activate(id: string, actorId: string) {
    return this.setActive(id, true, actorId);
  }
}
