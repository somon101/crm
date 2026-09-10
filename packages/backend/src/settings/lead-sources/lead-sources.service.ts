import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Injectable()
export class LeadSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.leadSource.findMany({ orderBy: { order: 'asc' } });
  }

  async findByIdOrThrow(id: string) {
    const source = await this.prisma.leadSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException('Lead source not found');
    }
    return source;
  }

  async create(dto: CreateLeadSourceDto, actorId: string) {
    const source = await this.prisma.leadSource.create({ data: dto });
    await this.auditService.record({
      entityType: 'LeadSource',
      entityId: source.id,
      action: AuditAction.CREATE,
      changes: { name: { old: null, new: source.name } },
      changedByUserId: actorId,
    });
    return source;
  }

  async update(id: string, dto: UpdateLeadSourceDto, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const source = await this.prisma.leadSource.update({ where: { id }, data: dto });
    await this.auditService.record({
      entityType: 'LeadSource',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, dto as Record<string, unknown>),
      changedByUserId: actorId,
    });
    return source;
  }

  private async setActive(id: string, isActive: boolean, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const source = await this.prisma.leadSource.update({ where: { id }, data: { isActive } });
    await this.auditService.record({
      entityType: 'LeadSource',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive }),
      changedByUserId: actorId,
    });
    return source;
  }

  deactivate(id: string, actorId: string) {
    return this.setActive(id, false, actorId);
  }

  activate(id: string, actorId: string) {
    return this.setActive(id, true, actorId);
  }
}
