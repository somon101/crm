import { Link } from 'react-router-dom';
import { useManagerDashboard } from '../hooks/useDashboard';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '../lib/utils';
import type { ManagerDashboard, Task } from '../types';

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      to={`/leads/${task.lead.id}`}
      className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted"
    >
      <div>
        <p className="font-medium">
          {task.lead.firstName} {task.lead.lastName}
        </p>
        <p className="text-muted-foreground">{task.comment || task.contactType}</p>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(task.dueAt)}</span>
    </Link>
  );
}

export function ManagerDashboardView({ data }: { data: ManagerDashboard }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Новые" value={data.leads.newCount} />
        <StatCard label="Активные" value={data.leads.activeCount} />
        <StatCard label="Планируют покупку" value={data.leads.planningPurchaseCount} />
        <StatCard label="Купили услугу" value={data.leads.boughtCount} />
        <StatCard label="Не купили" value={data.leads.notBoughtCount} />
        <StatCard label="Всего" value={data.leads.total} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Контакты сегодня ({data.tasks.todayCount})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.tasks.todayTasks.length === 0 ? (
              <EmptyState title="На сегодня задач нет" />
            ) : (
              data.tasks.todayTasks.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Просроченные контакты ({data.tasks.overdueCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.tasks.overdueTasks.length === 0 ? (
              <EmptyState title="Просроченных задач нет" />
            ) : (
              data.tasks.overdueTasks.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ManagerDashboardPage() {
  const { data, isLoading } = useManagerDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Мой дашборд</h1>
      <ManagerDashboardView data={data} />
    </div>
  );
}
