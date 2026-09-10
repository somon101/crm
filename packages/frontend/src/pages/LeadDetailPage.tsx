import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useLead, useLeadTimeline, useReassignLead, useUpdateLead } from '../hooks/useLeads';
import { leadStatusesApi, leadSourcesApi, tariffsApi, lossReasonsApi } from '../hooks/useSettings';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../lib/auth-context';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { StatusBadge, TemperatureBadge } from '../components/StatusBadge';
import { formatDate, formatMoney } from '../lib/utils';
import { EditLeadDialog } from '../components/lead-detail/EditLeadDialog';
import { ResultDialog } from '../components/lead-detail/ResultDialog';
import { AddInteractionForm } from '../components/lead-detail/AddInteractionForm';
import { AddTaskForm } from '../components/lead-detail/AddTaskForm';
import { LeadTimeline } from '../components/lead-detail/LeadTimeline';

const VEHICLE_INTEREST_LABEL: Record<string, string> = {
  SPECIFIC_CAR: 'Конкретный автомобиль',
  SPECIFIC_MODEL: 'Конкретная модель',
  SEVERAL_MODELS: 'Несколько моделей',
  UNDECIDED: 'Ещё не определился',
};

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: lead, isLoading } = useLead(id);
  const { data: timeline } = useLeadTimeline(id);
  const { data: statuses } = leadStatusesApi.useList();
  const { data: sources } = leadSourcesApi.useList();
  const { data: tariffs } = tariffsApi.useList();
  const { data: lossReasons } = lossReasonsApi.useList();
  const { data: users } = useUsers();
  const updateLead = useUpdateLead(id ?? '');
  const reassignLead = useReassignLead();

  const [editOpen, setEditOpen] = useState(false);
  const [wonOpen, setWonOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (isLoading || !lead || !statuses || !sources || !tariffs || !lossReasons) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const isTerminal = lead.status.isWon || lead.status.isLost;
  const wonStatus = statuses.find((s) => s.isWon);
  const lostStatus = statuses.find((s) => s.isLost);
  const managers = users?.filter((u) => u.role === 'MANAGER') ?? [];

  async function handleStatusChange(statusId: string) {
    if (!lead) return;
    const target = statuses?.find((s) => s.id === statusId);
    if (target?.isWon || target?.isLost) {
      // Won/lost transitions require the result fields — route through the dialog
      // instead of a bare status PATCH so the required fields are always collected.
      if (target.isWon) setWonOpen(true);
      else setLostOpen(true);
      return;
    }
    setStatusError(null);
    try {
      await updateLead.mutateAsync({ version: lead.version, statusId });
    } catch (err) {
      setStatusError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    }
  }

  async function handleTemperatureChange(temperature: string) {
    if (!lead) return;
    setStatusError(null);
    try {
      await updateLead.mutateAsync({ version: lead.version, temperature });
    } catch (err) {
      setStatusError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    }
  }

  async function handleReassign(managerId: string) {
    if (!id || !managerId) return;
    await reassignLead.mutateAsync({ id, managerId });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{lead.phone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="lead-status-badge">
            <StatusBadge status={lead.status} />
          </span>
          <TemperatureBadge temperature={lead.temperature} />
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Редактировать
          </Button>
        </div>
      </div>

      {statusError && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{statusError}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Контакты и источник</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Мессенджер</span>
              <span>{lead.messengerType ? `${lead.messengerType} · ${lead.messengerContact ?? ''}` : '—'}</span>
              <span className="text-muted-foreground">Доп. контакты</span>
              <span>{lead.additionalContactInfo || '—'}</span>
              <span className="text-muted-foreground">Первое обращение</span>
              <span>{formatDate(lead.firstContactDate)}</span>
              <span className="text-muted-foreground">Источник</span>
              <span>{lead.source.name}</span>
              <span className="text-muted-foreground">Менеджер</span>
              <span>{lead.manager ? `${lead.manager.firstName} ${lead.manager.lastName}` : '—'}</span>
            </CardContent>
          </Card>

          {(lead.contactReason || lead.managerNotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Потребность клиента</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {lead.contactReason && <p>{lead.contactReason}</p>}
                {lead.managerNotes && <p className="text-muted-foreground">{lead.managerNotes}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Интерес к автомобилю</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {lead.vehicleInterest ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="text-muted-foreground">Тип</span>
                  <span>{VEHICLE_INTEREST_LABEL[lead.vehicleInterest.interestType]}</span>
                  <span className="text-muted-foreground">Марка / модель</span>
                  <span>
                    {[lead.vehicleInterest.make, lead.vehicleInterest.model].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className="text-muted-foreground">Год</span>
                  <span>{lead.vehicleInterest.year ?? '—'}</span>
                  <span className="text-muted-foreground">Бюджет</span>
                  <span>{formatMoney(lead.vehicleInterest.budget)}</span>
                  {lead.vehicleInterest.comment && (
                    <>
                      <span className="text-muted-foreground">Комментарий</span>
                      <span>{lead.vehicleInterest.comment}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Клиент ещё не определился с автомобилем</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тариф и планируемая покупка</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Интересующий тариф</span>
              <span>{lead.interestedTariff?.name ?? '—'}</span>
              <span className="text-muted-foreground">Планируемый период</span>
              <span>{lead.plannedPurchasePeriodText || '—'}</span>
              <span className="text-muted-foreground">Планируемая дата</span>
              <span>{formatDate(lead.plannedPurchaseDate)}</span>
              {lead.plannedPurchaseComment && (
                <>
                  <span className="text-muted-foreground">Комментарий</span>
                  <span>{lead.plannedPurchaseComment}</span>
                </>
              )}
            </CardContent>
          </Card>

          {isTerminal && (
            <Card>
              <CardHeader>
                <CardTitle>{lead.status.isWon ? 'Результат: куплено' : 'Результат: не куплено'}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {lead.status.isWon ? (
                  <>
                    <span className="text-muted-foreground">Тариф</span>
                    <span>{lead.purchasedTariff?.name ?? '—'}</span>
                    <span className="text-muted-foreground">Автомобиль</span>
                    <span>
                      {[lead.purchasedCarMake, lead.purchasedCarModel, lead.purchasedCarYear]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </span>
                    <span className="text-muted-foreground">Цена</span>
                    <span>{formatMoney(lead.purchasePrice)}</span>
                    <span className="text-muted-foreground">Дата покупки</span>
                    <span>{formatDate(lead.purchaseDate)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Причина</span>
                    <span>{lead.lossReason?.name ?? '—'}</span>
                    {lead.lossComment && (
                      <>
                        <span className="text-muted-foreground">Комментарий</span>
                        <span>{lead.lossComment}</span>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>История</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTimeline entries={timeline ?? []} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Статус</span>
                <Select
                  data-testid="lead-status-select"
                  value={lead.status.id}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  {statuses
                    .filter((s) => s.isActive || s.id === lead.status.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Температура</span>
                <Select value={lead.temperature} onChange={(e) => handleTemperatureChange(e.target.value)}>
                  <option value="HOT">Горячий</option>
                  <option value="WARM">Тёплый</option>
                  <option value="COLD">Холодный</option>
                  <option value="UNDEFINED">Не определена</option>
                </Select>
              </label>

              {!isTerminal && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button size="sm" onClick={() => setWonOpen(true)} disabled={!wonStatus}>
                    Отметить: купил услугу
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLostOpen(true)} disabled={!lostStatus}>
                    Отметить: не купил
                  </Button>
                </div>
              )}

              {user?.role === 'ADMIN' && (
                <label className="flex flex-col gap-1 pt-2 text-sm">
                  <span className="text-muted-foreground">Менеджер (переназначить)</span>
                  <Select value={lead.manager?.id ?? ''} onChange={(e) => handleReassign(e.target.value)}>
                    <option value="" disabled>
                      Выберите менеджера
                    </option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Следующий контакт</CardTitle>
            </CardHeader>
            <CardContent>
              <AddTaskForm leadId={lead.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Добавить взаимодействие</CardTitle>
            </CardHeader>
            <CardContent>
              <AddInteractionForm leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <EditLeadDialog
        lead={lead}
        sources={sources}
        tariffs={tariffs}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ResultDialog
        mode="WON"
        lead={lead}
        targetStatus={wonStatus}
        tariffs={tariffs}
        lossReasons={lossReasons}
        open={wonOpen}
        onOpenChange={setWonOpen}
      />
      <ResultDialog
        mode="LOST"
        lead={lead}
        targetStatus={lostStatus}
        tariffs={tariffs}
        lossReasons={lossReasons}
        open={lostOpen}
        onOpenChange={setLostOpen}
      />
    </div>
  );
}
