import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TASK_LIST_INCLUDE = {
  lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async leadCounts(baseWhere: Prisma.LeadWhereInput) {
    const scoped = (extra: Prisma.LeadWhereInput): Prisma.LeadWhereInput => ({
      AND: [baseWhere, extra],
    });
    const [total, newCount, activeCount, boughtCount, notBoughtCount, planningPurchaseCount] =
      await Promise.all([
        this.prisma.lead.count({ where: baseWhere }),
        this.prisma.lead.count({ where: scoped({ status: { isDefault: true } }) }),
        this.prisma.lead.count({ where: scoped({ status: { isWon: false, isLost: false } }) }),
        this.prisma.lead.count({ where: scoped({ status: { isWon: true } }) }),
        this.prisma.lead.count({ where: scoped({ status: { isLost: true } }) }),
        this.prisma.lead.count({
          where: scoped({
            plannedPurchaseDate: { not: null },
            status: { isWon: false, isLost: false },
          }),
        }),
      ]);
    return { total, newCount, activeCount, boughtCount, notBoughtCount, planningPurchaseCount };
  }

  private async taskLists(assignedToUserId: string | undefined) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const base: Prisma.TaskWhereInput = assignedToUserId ? { assignedToUserId } : {};

    const [todayTasks, overdueTasks, todayCount, overdueCount] = await Promise.all([
      this.prisma.task.findMany({
        where: { ...base, status: 'PENDING', dueAt: { gte: todayStart, lte: todayEnd } },
        include: TASK_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      this.prisma.task.findMany({
        where: { ...base, status: 'PENDING', dueAt: { lt: todayStart } },
        include: TASK_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      this.prisma.task.count({
        where: { ...base, status: 'PENDING', dueAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.task.count({ where: { ...base, status: 'PENDING', dueAt: { lt: todayStart } } }),
    ]);

    return { todayTasks, overdueTasks, todayCount, overdueCount };
  }

  async getManagerDashboard(managerId: string) {
    const [leads, tasks] = await Promise.all([
      this.leadCounts({ deletedAt: null, managerId }),
      this.taskLists(managerId),
    ]);
    return { leads, tasks };
  }

  async getAdminDashboard() {
    const [leads, tasks, perManagerRaw, sourceRaw, lossReasonRaw, managers, sources, lossReasons] =
      await Promise.all([
        this.leadCounts({ deletedAt: null }),
        this.taskLists(undefined),
        this.prisma.lead.groupBy({
          by: ['managerId'],
          where: { deletedAt: null, managerId: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['sourceId'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['lossReasonId'],
          where: { deletedAt: null, lossReasonId: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.user.findMany({
          where: { role: 'MANAGER' },
          select: { id: true, firstName: true, lastName: true, isActive: true },
        }),
        this.prisma.leadSource.findMany({ select: { id: true, name: true } }),
        this.prisma.lossReason.findMany({ select: { id: true, name: true } }),
      ]);

    const conversionRate =
      leads.boughtCount + leads.notBoughtCount > 0
        ? Math.round((leads.boughtCount / (leads.boughtCount + leads.notBoughtCount)) * 1000) / 10
        : 0;

    const perManager = perManagerRaw.map((row) => ({
      managerId: row.managerId,
      manager: managers.find((m) => m.id === row.managerId) ?? null,
      leadCount: row._count._all,
    }));

    const bySource = sourceRaw.map((row) => ({
      sourceId: row.sourceId,
      name: sources.find((s) => s.id === row.sourceId)?.name ?? 'Unknown',
      count: row._count._all,
    }));

    const byLossReason = lossReasonRaw.map((row) => ({
      lossReasonId: row.lossReasonId,
      name: lossReasons.find((r) => r.id === row.lossReasonId)?.name ?? 'Unknown',
      count: row._count._all,
    }));

    return { leads, tasks, conversionRate, perManager, bySource, byLossReason };
  }
}
