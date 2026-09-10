import { useState, type FormEvent } from 'react';
import { ContactType } from '@crm/shared';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { useCreateTask } from '../../hooks/useTasks';

const LABEL: Record<string, string> = {
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  MEETING: 'Встреча',
  OTHER: 'Другое',
};

export function AddTaskForm({ leadId }: { leadId: string }) {
  const createTask = useCreateTask();
  const [dueAt, setDueAt] = useState('');
  const [contactType, setContactType] = useState<string>(ContactType.CALL);
  const [comment, setComment] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dueAt) return;
    await createTask.mutateAsync({
      leadId,
      dueAt: new Date(dueAt).toISOString(),
      contactType,
      comment: comment || undefined,
    });
    setDueAt('');
    setComment('');
  }

  return (
    // Always stacked, never a viewport-based sm:flex-row: this form lives inside a
    // narrow sidebar card on desktop (~1/3 of the grid), not the full viewport width,
    // so a viewport breakpoint switched to a row and crammed/clipped every field there.
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Дата и время следующего контакта">
        <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тип">
          <Select value={contactType} onChange={(e) => setContactType(e.target.value)}>
            {Object.entries(LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Комментарий / задача">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Уточнить решение" />
        </Field>
      </div>
      <Button type="submit" disabled={createTask.isPending || !dueAt} className="w-full">
        Запланировать
      </Button>
    </form>
  );
}
