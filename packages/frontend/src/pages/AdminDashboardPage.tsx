import { Link } from 'react-router-dom';
import { useAdminDashboard } from '../hooks/useDashboard';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

export function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Дашборд администратора</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Новые" value={data.leads.newCount} />
        <StatCard label="Активные" value={data.leads.activeCount} />
        <StatCard label="Купили услугу" value={data.leads.boughtCount} />
        <StatCard label="Не купили" value={data.leads.notBoughtCount} />
        <StatCard label="Контакты сегодня" value={data.tasks.todayCount} />
        <StatCard label="Просрочено" value={data.tasks.overdueCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Конверсия</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{data.conversionRate}%</p>
          <p className="text-sm text-muted-foreground">
            {data.leads.boughtCount} куплено из {data.leads.boughtCount + data.leads.notBoughtCount} завершённых
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>По менеджерам</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.perManager.length === 0 ? (
              <EmptyState title="Нет менеджеров" />
            ) : (
              data.perManager.map((row) => (
                <Link
                  key={row.managerId}
                  to={`/admin/managers/${row.managerId}`}
                  className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
                >
                  <span>
                    {row.manager ? `${row.manager.firstName} ${row.manager.lastName}` : 'Без менеджера'}
                  </span>
                  <span className="font-medium">{row.leadCount}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Источники лидов</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.bySource.map((row) => (
              <div key={row.sourceId} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Причины отказов</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.byLossReason.length === 0 ? (
              <EmptyState title="Отказов пока нет" />
            ) : (
              data.byLossReason.map((row) => (
                <div key={row.lossReasonId} className="flex items-center justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
