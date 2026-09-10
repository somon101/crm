import { useState, type FormEvent, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';

interface ReferenceItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface ReferenceListEditorProps<T extends ReferenceItem> {
  title: string;
  items: T[] | undefined;
  isLoading: boolean;
  onCreate: (name: string) => Promise<unknown>;
  onSetActive: (id: string, active: boolean) => Promise<unknown>;
  renderExtra?: (item: T) => ReactNode;
  createExtraFields?: ReactNode;
}

export function ReferenceListEditor<T extends ReferenceItem>({
  title,
  items,
  isLoading,
  onCreate,
  onSetActive,
  renderExtra,
}: ReferenceListEditorProps<T>) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
    } catch (err) {
      setError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" size="sm" disabled={isSubmitting || !name.trim()}>
          Добавить
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <Spinner />
      ) : !items || items.length === 0 ? (
        <EmptyState title="Пока пусто" />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span>{item.name}</span>
                {!item.isActive && (
                  <Badge className="border-muted-foreground text-muted-foreground">Отключён</Badge>
                )}
                {renderExtra?.(item)}
              </div>
              <Button
                size="sm"
                variant={item.isActive ? 'outline' : 'default'}
                onClick={() => onSetActive(item.id, !item.isActive)}
              >
                {item.isActive ? 'Отключить' : 'Включить'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
