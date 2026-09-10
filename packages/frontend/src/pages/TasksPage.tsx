import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDateTime } from '../lib/utils';
import type { Task } from '../types';

const CONTACT_TYPE_LABEL: Record<string, string> = {
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  MEETING: 'Встреча',
  OTHER: 'Другое',
};

function TaskCard({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const isOverdue = task.status === 'PENDING' && new Date(task.dueAt) < new Date();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link to={`/leads/${task.lead.id}`} className="font-medium hover:underline">
          {task.lead.firstName} {task.lead.lastName}
        </Link>
        <p className="text-sm text-muted-foreground">
          {CONTACT_TYPE_LABEL[task.contactType]}
          {task.comment ? ` · ${task.comment}` : ''}
        </p>
        <p className={`text-xs ${isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
          {formatDateTime(task.dueAt)} {isOverdue && '· просрочено'}
        </p>
      </div>
      {task.status === 'PENDING' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={updateTask.isPending}
            onClick={() => updateTask.mutate({ id: task.id, version: task.version, status: 'DONE' })}
          >
            Выполнено
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={updateTask.isPending}
            onClick={() => updateTask.mutate({ id: task.id, version: task.version, status: 'CANCELLED' })}
          >
            Отменить
          </Button>
        </div>
      )}
      {task.status !== 'PENDING' && (
        <span className="text-xs text-muted-foreground">
          {task.status === 'DONE' ? 'Выполнено' : 'Отменено'}
        </span>
      )}
    </div>
  );
}

export function TasksPage() {
  const [status, setStatus] = useState('PENDING');
  const { data: tasks, isLoading } = useTasks({ status: status || undefined });

  const sorted = tasks
    ? [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Задачи</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="PENDING">Активные</option>
          <option value="DONE">Выполненные</option>
          <option value="CANCELLED">Отменённые</option>
          <option value="">Все</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState title="Задач нет" description="Задачи создаются на странице лида" />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
