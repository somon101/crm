import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeads } from '../hooks/useLeads';
import { leadStatusesApi, leadSourcesApi, tariffsApi } from '../hooks/useSettings';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../lib/auth-context';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { buttonVariants } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge, TemperatureBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import type { Lead } from '../types';

function CarSummary({ lead }: { lead: Lead }) {
  if (!lead.vehicleInterest) return <span className="text-muted-foreground">—</span>;
  const text = [lead.vehicleInterest.make, lead.vehicleInterest.model].filter(Boolean).join(' ');
  return <span>{text || '—'}</span>;
}

export function LeadsListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [managerId, setManagerId] = useState('');

  const { data: statuses } = leadStatusesApi.useList();
  const { data: sources } = leadSourcesApi.useList();
  const { data: users } = useUsers();
  const { data: tariffs } = tariffsApi.useList();

  const { data, isLoading } = useLeads({
    search: search || undefined,
    statusId: statusId || undefined,
    temperature: temperature || undefined,
    sourceId: sourceId || undefined,
    managerId: user?.role === 'ADMIN' ? managerId || undefined : undefined,
    limit: 100,
  });

  const managers = users?.filter((u) => u.role === 'MANAGER') ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-lg font-semibold">Лиды</h1>
        <Link to="/leads/new" className={buttonVariants()}>
          Новый лид
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Поиск: имя, телефон, авто…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
          <option value="">Все статусы</option>
          {statuses?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={temperature} onChange={(e) => setTemperature(e.target.value)}>
          <option value="">Любая температура</option>
          <option value="HOT">Горячий</option>
          <option value="WARM">Тёплый</option>
          <option value="COLD">Холодный</option>
          <option value="UNDEFINED">Не определена</option>
        </Select>
        <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Все источники</option>
          {sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {user?.role === 'ADMIN' && (
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading || !tariffs ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : data && data.items.length === 0 ? (
        <EmptyState title="Лиды не найдены" description="Измените фильтры или создайте нового лида" />
      ) : (
        <>
          {/* Desktop / tablet: table. Mobile: cards. Same data, no horizontal scroll. */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Клиент</th>
                  <th className="p-3 font-medium">Авто</th>
                  <th className="p-3 font-medium">Статус</th>
                  <th className="p-3 font-medium">Температура</th>
                  <th className="p-3 font-medium">След. контакт</th>
                  <th className="p-3 font-medium">Тариф</th>
                  <th className="p-3 font-medium">Менеджер</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((lead) => (
                  <tr key={lead.id} className="border-t border-border hover:bg-muted">
                    <td className="p-3">
                      <Link to={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </td>
                    <td className="p-3">
                      <CarSummary lead={lead} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="p-3">
                      <TemperatureBadge temperature={lead.temperature} />
                    </td>
                    <td className="p-3 text-xs">{formatDate(lead.plannedPurchaseDate)}</td>
                    <td className="p-3 text-xs">{lead.interestedTariff?.name ?? '—'}</td>
                    <td className="p-3 text-xs">
                      {lead.manager ? `${lead.manager.firstName} ${lead.manager.lastName}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {data?.items.map((lead) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </span>
                  <TemperatureBadge temperature={lead.temperature} />
                </div>
                <p className="text-xs text-muted-foreground">{lead.phone}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <CarSummary lead={lead} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{lead.manager ? `${lead.manager.firstName} ${lead.manager.lastName}` : '—'}</span>
                  <span>{formatDate(lead.plannedPurchaseDate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
