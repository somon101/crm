import { useParams } from 'react-router-dom';
import { useManagerDrilldown } from '../hooks/useDashboard';
import { useUsers } from '../hooks/useUsers';
import { Spinner } from '../components/ui/Spinner';
import { ManagerDashboardView } from './ManagerDashboardPage';

export function ManagerDrilldownPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useManagerDrilldown(id);
  const { data: users } = useUsers();
  const manager = users?.find((u) => u.id === id);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">
        Работа менеджера{manager ? `: ${manager.firstName} ${manager.lastName}` : ''}
      </h1>
      <ManagerDashboardView data={data} />
    </div>
  );
}
