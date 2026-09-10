import { Link } from 'react-router-dom';
import { useAuditLog } from '../hooks/useAuditLog';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDateTime } from '../lib/utils';

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
  STATUS_CHANGE: 'Смена статуса',
  REASSIGN: 'Смена менеджера',
};

export function AdminAuditLogPage() {
  const { data, isLoading } = useAuditLog({ limit: 100 });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">История изменений</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Записей пока нет" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((entry) => (
            <li key={entry.id} className="rounded-md border border-border p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {ACTION_LABEL[entry.action] ?? entry.action} · {entry.entityType}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
              </div>
              <p className="text-muted-foreground">
                {Object.entries(entry.changes)
                  .map(([field, { old: o, new: n }]) => `${field}: ${String(o ?? '—')} → ${String(n ?? '—')}`)
                  .join('; ') || '—'}
              </p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.changedBy ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}` : 'Система'}</span>
                {entry.leadId && (
                  <Link to={`/leads/${entry.leadId}`} className="hover:underline">
                    Открыть лида
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
