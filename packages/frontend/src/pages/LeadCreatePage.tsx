import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { EMPTY_LEAD_FORM, leadFormToPayload, LeadForm, type LeadFormValues } from '../components/LeadForm';
import { useCreateLead } from '../hooks/useLeads';
import { tariffsApi, leadSourcesApi } from '../hooks/useSettings';
import { Spinner } from '../components/ui/Spinner';

export function LeadCreatePage() {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const { data: sources } = leadSourcesApi.useList();
  const { data: tariffs } = tariffsApi.useList();
  const [error, setError] = useState<string | null>(null);

  if (!sources || !tariffs) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  async function handleSubmit(values: LeadFormValues) {
    setError(null);
    try {
      const lead = await createLead.mutateAsync(leadFormToPayload(values));
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? 'Не удалось создать лида');
      } else {
        setError('Не удалось создать лида');
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-lg font-semibold">Новый лид</h1>
      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}
      <LeadForm
        initialValues={EMPTY_LEAD_FORM}
        sources={sources.filter((s) => s.isActive)}
        tariffs={tariffs.filter((t) => t.isActive)}
        onSubmit={handleSubmit}
        submitLabel="Создать лида"
        isSubmitting={createLead.isPending}
      />
    </div>
  );
}
