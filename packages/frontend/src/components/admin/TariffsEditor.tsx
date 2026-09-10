import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { tariffsApi } from '../../hooks/useSettings';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { formatMoney } from '../../lib/utils';

export function TariffsEditor() {
  const { data: tariffs, isLoading } = tariffsApi.useList();
  const create = tariffsApi.useCreate();
  const setActive = tariffsApi.useSetActive();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), price: Number(price), description: description || undefined });
      setName('');
      setPrice('');
      setDescription('');
    } catch (err) {
      setError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Тарифы</h2>
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-4">
        <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="Цена"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2"
        />
        <Button type="submit" size="sm" disabled={create.isPending || !name.trim() || !price}>
          Добавить тариф
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <Spinner />
      ) : !tariffs || tariffs.length === 0 ? (
        <EmptyState title="Тарифов пока нет" />
      ) : (
        <ul className="flex flex-col gap-2">
          {tariffs.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
              <div>
                <span className="font-medium">{t.name}</span>
                <span className="ml-2 text-muted-foreground">{formatMoney(t.price)}</span>
                {!t.isActive && (
                  <Badge className="ml-2 border-muted-foreground text-muted-foreground">Отключён</Badge>
                )}
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </div>
              <Button
                size="sm"
                variant={t.isActive ? 'outline' : 'default'}
                onClick={() => setActive.mutate({ id: t.id, active: !t.isActive })}
              >
                {t.isActive ? 'Отключить' : 'Включить'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
