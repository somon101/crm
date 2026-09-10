import { useState } from 'react';
import { cn } from '../lib/utils';
import { TariffsEditor } from '../components/admin/TariffsEditor';
import { LeadStatusesEditor } from '../components/admin/LeadStatusesEditor';
import { ReferenceListEditor } from '../components/admin/ReferenceListEditor';
import { leadSourcesApi, lossReasonsApi } from '../hooks/useSettings';

const TABS = [
  { key: 'tariffs', label: 'Тарифы' },
  { key: 'statuses', label: 'Статусы' },
  { key: 'sources', label: 'Источники' },
  { key: 'loss-reasons', label: 'Причины отказа' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function AdminSettingsPage() {
  const [tab, setTab] = useState<TabKey>('tariffs');
  const { data: sources, isLoading: sourcesLoading } = leadSourcesApi.useList();
  const createSource = leadSourcesApi.useCreate();
  const setSourceActive = leadSourcesApi.useSetActive();
  const { data: lossReasons, isLoading: lossReasonsLoading } = lossReasonsApi.useList();
  const createLossReason = lossReasonsApi.useCreate();
  const setLossReasonActive = lossReasonsApi.useSetActive();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Настройки CRM</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tariffs' && <TariffsEditor />}
      {tab === 'statuses' && <LeadStatusesEditor />}
      {tab === 'sources' && (
        <ReferenceListEditor
          title="Источники лидов"
          items={sources}
          isLoading={sourcesLoading}
          onCreate={(name) => createSource.mutateAsync({ name })}
          onSetActive={(id, active) => setSourceActive.mutateAsync({ id, active })}
        />
      )}
      {tab === 'loss-reasons' && (
        <ReferenceListEditor
          title="Причины отказа"
          items={lossReasons}
          isLoading={lossReasonsLoading}
          onCreate={(name) => createLossReason.mutateAsync({ name })}
          onSetActive={(id, active) => setLossReasonActive.mutateAsync({ id, active })}
        />
      )}
    </div>
  );
}
