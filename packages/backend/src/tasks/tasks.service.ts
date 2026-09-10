import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/types';
import { LeadsService } from '../leads/leads.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leadsService: LeadsService,
  ) {}

  private ownershipWhere(user: AuthenticatedUser): Prisma.TaskWhereInput {
    return user.role === Role.MANAGER ? { assignedToUserId: user.id } : {};
  }

  async findAll(user: AuthenticatedUser, query: QueryTasksDto) {
    const and: Prisma.TaskWhereInput[] = [this.ownershipWhere(user)];
    if (user.role === Role.ADMIN && query.managerId)
      and.push({ assignedToUserId: query.managerId });
    if (query.leadId) and.push({ leadId: query.leadId });
    if (query.status) and.push({ status: query.status });
    if (query.dueFrom || query.dueTo) {
      and.push({
        dueAt: {
          ...(query.dueFrom && { gte: query.dueFrom }),
          ...(query.dueTo && { lte: query.dueTo }),
        },
      });
    }
    return this.prisma.task.findMany({
      where: { AND: and },
      include: TASK_INCLUDE,
      orderBy: { dueAt: 'asc' },
    });
  }

  async findOneOrThrow(id: string, user: AuthenticatedUser) {
    const task = await this.prisma.task.findFirst({
      where: { id, ...this.ownershipWhere(user) },
      include: TASK_INCLUDE,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(dto: CreateTaskDto, user: AuthenticatedUser) {
    // Proves the caller may act on this lead at all — the real ownership gate.
    const lead = await this.leadsService.findOneOrThrow(dto.leadId, user);

    const assignedToUserId =
      user.role === Role.MANAGER ? user.id : (dto.assignedToUserId ?? lead.managerId ?? user.id);

    const task = await this.prisma.task.create({
      data: {
        leadId: dto.leadId,
        assignedToUserId,
        dueAt: dto.dueAt,
        contactType: dto.contactType,
        comment: dto.comment,
      },
      include: TASK_INCLUDE,
    });

    await this.auditService.record({
      entityType: 'Task',
      entityId: task.id,
      leadId: dto.leadId,
      action: AuditAction.CREATE,
      changes: {
        dueAt: { old: null, new: task.dueAt },
        contactType: { old: null, new: task.contactType },
      },
      changedByUserId: user.id,
    });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthenticatedUser) {
    const before = await this.findOneOrThrow(id, user);
    const { version, ...scalarDto } = dto;

    const updateResult = await this.prisma.task.updateMany({
      where: { id, version, ...this.ownershipWhere(user) },
      data: { ...scalarDto, version: { increment: 1 } },
    });

    if (updateResult.count === 0) {
      const current = await this.findOneOrThrow(id, user);
      throw new ConflictException({
        message: 'This task was modified by someone else. Refresh and try again.',
        currentRecord: current,
      });
    }

    await this.auditService.record({
      entityType: 'Task',
      entityId: id,
      leadId: before.leadId,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(
        before as unknown as Record<string, unknown>,
        scalarDto as Record<string, unknown>,
      ),
      changedByUserId: user.id,
    });

    return this.findOneOrThrow(id, user);
  }
}
