import { formatDateTime } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';
import type { TimelineEntry } from '../../types';

const INTERACTION_LABEL: Record<string, string> = {
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  MEETING: 'Встреча',
  COMMENT: 'Комментарий',
  OTHER: 'Другое',
};

// STATUS_CHANGE/REASSIGN only ever happen on Lead, so they don't need an entity
// qualifier. CREATE/UPDATE/DELETE can also come from a Task's own AuditLog rows
// (e.g. creating a next-contact task) surfaced in this same lead-scoped timeline —
// those must read "задачи", not be mislabeled as if the lead itself were recreated.
const ACTION_VERB: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
  STATUS_CHANGE: 'Смена статуса',
  REASSIGN: 'Смена менеджера',
};

const ENTITY_LABEL: Record<string, string> = {
  Lead: 'лида',
  Task: 'задачи',
};

function describeAction(action: string | undefined, entityType: string | undefined): string {
  if (action === 'STATUS_CHANGE' || action === 'REASSIGN') {
    return ACTION_VERB[action];
  }
  const verb = ACTION_VERB[action ?? 'UPDATE'] ?? action ?? 'Изменение';
  const entity = entityType ? ENTITY_LABEL[entityType] : undefined;
  return entity ? `${verb} ${entity}` : verb;
}

function describeChanges(changes: Record<string, { old: unknown; new: unknown }> | undefined): string {
  if (!changes || Object.keys(changes).length === 0) return '';
  return Object.entries(changes)
    .map(([field, { old: oldValue, new: newValue }]) => `${field}: ${String(oldValue ?? '—')} → ${String(newValue ?? '—')}`)
    .join('; ');
}

export function LeadTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="История пуста" />;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`} className="rounded-md border border-border p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-medium">
              {entry.kind === 'INTERACTION'
                ? INTERACTION_LABEL[entry.type ?? 'OTHER']
                : describeAction(entry.action, entry.entityType)}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
          </div>
          {entry.kind === 'INTERACTION' && <p className="text-muted-foreground">{entry.comment}</p>}
          {entry.kind === 'AUDIT' && (
            <p className="text-muted-foreground">{describeChanges(entry.changes) || '—'}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.author ? `${entry.author.firstName} ${entry.author.lastName}` : 'Система'}
          </p>
        </li>
      ))}
    </ol>
  );
}
