import { useState, type FormEvent } from 'react';
import { InteractionType } from '@crm/shared';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useAddInteraction } from '../../hooks/useLeads';

const LABEL: Record<string, string> = {
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  MEETING: 'Встреча',
  COMMENT: 'Комментарий',
  OTHER: 'Другое',
};

export function AddInteractionForm({ leadId }: { leadId: string }) {
  const addInteraction = useAddInteraction(leadId);
  const [type, setType] = useState<string>(InteractionType.CALL);
  const [comment, setComment] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    await addInteraction.mutateAsync({ type, comment });
    setComment('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
          {Object.entries(LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={addInteraction.isPending || !comment.trim()}>
          Добавить
        </Button>
      </div>
      <Textarea
        placeholder="Результат общения с клиентом…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
    </form>
  );
}
