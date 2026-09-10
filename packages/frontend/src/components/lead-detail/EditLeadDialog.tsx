import { useState } from 'react';
import { AxiosError } from 'axios';
import { Dialog } from '../ui/Dialog';
import { LeadForm, leadFormToPayload, leadToFormValues, type LeadFormValues } from '../LeadForm';
import { useUpdateLead } from '../../hooks/useLeads';
import type { Lead, LeadSource, Tariff } from '../../types';

export function EditLeadDialog({
  lead,
  sources,
  tariffs,
  open,
  onOpenChange,
}: {
  lead: Lead;
  sources: LeadSource[];
  tariffs: Tariff[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLead = useUpdateLead(lead.id);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: LeadFormValues) {
    setError(null);
    try {
      await updateLead.mutateAsync({ version: lead.version, ...leadFormToPayload(values) });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        setError('Лид был изменён другим пользователем. Обновите страницу и попробуйте снова.');
      } else if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? 'Не удалось сохранить изменения');
      } else {
        setError('Не удалось сохранить изменения');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Редактировать лида" className="max-w-2xl">
      {error && <p className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <LeadForm
        initialValues={leadToFormValues(lead)}
        sources={sources}
        tariffs={tariffs}
        onSubmit={handleSubmit}
        submitLabel="Сохранить"
        isSubmitting={updateLead.isPending}
      />
    </Dialog>
  );
}
