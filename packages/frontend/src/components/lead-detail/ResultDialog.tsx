import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Dialog } from '../ui/Dialog';
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useUpdateLead } from '../../hooks/useLeads';
import { toInputDate } from '../../lib/utils';
import { MAX_CAR_YEAR, MIN_CAR_YEAR } from '../../lib/constants';
import type { Lead, LeadStatus, LossReason, Tariff } from '../../types';

interface ResultDialogProps {
  mode: 'WON' | 'LOST';
  lead: Lead;
  targetStatus: LeadStatus | undefined;
  tariffs: Tariff[];
  lossReasons: LossReason[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResultDialog({
  mode,
  lead,
  targetStatus,
  tariffs,
  lossReasons,
  open,
  onOpenChange,
}: ResultDialogProps) {
  const updateLead = useUpdateLead(lead.id);
  const [error, setError] = useState<string | null>(null);

  const [purchasedTariffId, setPurchasedTariffId] = useState(lead.purchasedTariff?.id ?? '');
  const [purchasedCarMake, setPurchasedCarMake] = useState(lead.purchasedCarMake ?? '');
  const [purchasedCarModel, setPurchasedCarModel] = useState(lead.purchasedCarModel ?? '');
  const [purchasedCarYear, setPurchasedCarYear] = useState(lead.purchasedCarYear?.toString() ?? '');
  const [purchasePrice, setPurchasePrice] = useState(lead.purchasePrice ?? '');
  const [purchaseDate, setPurchaseDate] = useState(toInputDate(lead.purchaseDate) || toInputDate(new Date().toISOString()));
  const [lossReasonId, setLossReasonId] = useState(lead.lossReason?.id ?? '');
  const [lossComment, setLossComment] = useState(lead.lossComment ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!targetStatus) return;
    setError(null);
    try {
      if (mode === 'WON') {
        await updateLead.mutateAsync({
          version: lead.version,
          statusId: targetStatus.id,
          purchasedTariffId,
          purchasedCarMake: purchasedCarMake || undefined,
          purchasedCarModel: purchasedCarModel || undefined,
          purchasedCarYear: purchasedCarYear ? Number(purchasedCarYear) : undefined,
          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
        });
      } else {
        await updateLead.mutateAsync({
          version: lead.version,
          statusId: targetStatus.id,
          lossReasonId,
          lossComment: lossComment || undefined,
        });
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? 'Не удалось сохранить результат');
      } else {
        setError('Не удалось сохранить результат');
      }
    }
  }

  if (!targetStatus) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={mode === 'WON' ? 'Клиент купил услугу' : 'Клиент не купил'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        {mode === 'WON' ? (
          <>
            <Field label="Купленный тариф" required>
              <Select value={purchasedTariffId} onChange={(e) => setPurchasedTariffId(e.target.value)} required>
                <option value="">Выберите тариф</option>
                {tariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Марка авто">
                <Input value={purchasedCarMake} onChange={(e) => setPurchasedCarMake(e.target.value)} />
              </Field>
              <Field label="Модель авто">
                <Input value={purchasedCarModel} onChange={(e) => setPurchasedCarModel(e.target.value)} />
              </Field>
              <Field label="Год">
                <Input
                  type="number"
                  min={MIN_CAR_YEAR}
                  max={MAX_CAR_YEAR}
                  step={1}
                  value={purchasedCarYear}
                  onChange={(e) => setPurchasedCarYear(e.target.value)}
                />
              </Field>
              <Field label="Цена" required>
                <Input
                  type="number"
                  min={0}
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Дата покупки" required>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </Field>
          </>
        ) : (
          <>
            <Field label="Причина отказа" required>
              <Select value={lossReasonId} onChange={(e) => setLossReasonId(e.target.value)} required>
                <option value="">Выберите причину</option>
                {lossReasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Комментарий">
              <Textarea value={lossComment} onChange={(e) => setLossComment(e.target.value)} rows={3} />
            </Field>
          </>
        )}
        <Button type="submit" disabled={updateLead.isPending}>
          Сохранить
        </Button>
      </form>
    </Dialog>
  );
}
