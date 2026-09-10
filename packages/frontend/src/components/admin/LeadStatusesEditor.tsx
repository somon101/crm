import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { leadStatusesApi } from '../../hooks/useSettings';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';

export function LeadStatusesEditor() {
  const { data: statuses, isLoading } = leadStatusesApi.useList();
  const create = leadStatusesApi.useCreate();
  const setActive = leadStatusesApi.useSetActive();
  const [name, setName] = useState('');
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      const nextOrder = (statuses?.length ?? 0) + 1;
      await create.mutateAsync({
        key: name.trim().toUpperCase().replace(/\s+/g, '_'),
        name: name.trim(),
        order: nextOrder,
        isWon,
        isLost,
      });
      setName('');
      setIsWon(false);
      setIsLost(false);
    } catch (err) {
      setError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Статусы лидов</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Input placeholder="Название статуса" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={isWon} onChange={(e) => setIsWon(e.target.checked)} />
          Победа (куплено)
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={isLost} onChange={(e) => setIsLost(e.target.checked)} />
          Отказ
        </label>
        <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
          Добавить статус
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <Spinner />
      ) : !statuses || statuses.length === 0 ? (
        <EmptyState title="Статусов пока нет" />
      ) : (
        <ul className="flex flex-col gap-2">
          {[...statuses]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{s.name}</span>
                  {s.isDefault && <Badge>По умолчанию</Badge>}
                  {s.isWon && <Badge className="border-green-600 text-green-600">Победа</Badge>}
                  {s.isLost && <Badge className="border-destructive text-destructive">Отказ</Badge>}
                  {!s.isActive && (
                    <Badge className="border-muted-foreground text-muted-foreground">Отключён</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={s.isActive ? 'outline' : 'default'}
                  onClick={() => setActive.mutate({ id: s.id, active: !s.isActive })}
                >
                  {s.isActive ? 'Отключить' : 'Включить'}
                </Button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
