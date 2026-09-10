import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.tariff.findMany({ orderBy: { name: 'asc' } });
  }

  async findByIdOrThrow(id: string) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id } });
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }
    return tariff;
  }

  async create(dto: CreateTariffDto, actorId: string) {
    const tariff = await this.prisma.tariff.create({ data: dto });
    await this.auditService.record({
      entityType: 'Tariff',
      entityId: tariff.id,
      action: AuditAction.CREATE,
      changes: { name: { old: null, new: tariff.name } },
      changedByUserId: actorId,
    });
    return tariff;
  }

  async update(id: string, dto: UpdateTariffDto, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const tariff = await this.prisma.tariff.update({ where: { id }, data: dto });
    await this.auditService.record({
      entityType: 'Tariff',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, dto as Record<string, unknown>),
      changedByUserId: actorId,
    });
    return tariff;
  }

  private async setActive(id: string, isActive: boolean, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const tariff = await this.prisma.tariff.update({ where: { id }, data: { isActive } });
    await this.auditService.record({
      entityType: 'Tariff',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive }),
      changedByUserId: actorId,
    });
    return tariff;
  }

  deactivate(id: string, actorId: string) {
    return this.setActive(id, false, actorId);
  }

  activate(id: string, actorId: string) {
    return this.setActive(id, true, actorId);
  }
}
