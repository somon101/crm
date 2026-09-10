import { useState, type FormEvent } from 'react';
import { Temperature } from '@crm/shared';
import { MAX_CAR_YEAR, MIN_CAR_YEAR } from '../lib/constants';
import { Field } from './ui/Field';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Lead, LeadSource, Tariff } from '../types';
import { toInputDate } from '../lib/utils';

export interface LeadFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  messengerType: string;
  messengerContact: string;
  additionalContactInfo: string;
  firstContactDate: string;
  sourceId: string;
  contactReason: string;
  managerNotes: string;
  interestedTariffId: string;
  temperature: string;
  vehicleInterestType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleBudget: string;
  vehicleComment: string;
  plannedPurchasePeriodText: string;
  plannedPurchaseDate: string;
  plannedPurchaseComment: string;
}

const MESSENGER_LABEL: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  VIBER: 'Viber',
  INSTAGRAM_DM: 'Instagram',
  OTHER: 'Другое',
};

const TEMPERATURE_LABEL: Record<string, string> = {
  HOT: 'Горячий',
  WARM: 'Тёплый',
  COLD: 'Холодный',
  UNDEFINED: 'Не определена',
};

const INTEREST_TYPE_LABEL: Record<string, string> = {
  SPECIFIC_CAR: 'Конкретный автомобиль',
  SPECIFIC_MODEL: 'Конкретная модель',
  SEVERAL_MODELS: 'Несколько моделей',
  UNDECIDED: 'Ещё не определился',
};

export function leadToFormValues(lead: Lead): LeadFormValues {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    messengerType: lead.messengerType ?? '',
    messengerContact: lead.messengerContact ?? '',
    additionalContactInfo: lead.additionalContactInfo ?? '',
    firstContactDate: toInputDate(lead.firstContactDate),
    sourceId: lead.source.id,
    contactReason: lead.contactReason ?? '',
    managerNotes: lead.managerNotes ?? '',
    interestedTariffId: lead.interestedTariff?.id ?? '',
    temperature: lead.temperature,
    vehicleInterestType: lead.vehicleInterest?.interestType ?? '',
    vehicleMake: lead.vehicleInterest?.make ?? '',
    vehicleModel: lead.vehicleInterest?.model ?? '',
    vehicleYear: lead.vehicleInterest?.year?.toString() ?? '',
    vehicleBudget: lead.vehicleInterest?.budget ?? '',
    vehicleComment: lead.vehicleInterest?.comment ?? '',
    plannedPurchasePeriodText: lead.plannedPurchasePeriodText ?? '',
    plannedPurchaseDate: toInputDate(lead.plannedPurchaseDate),
    plannedPurchaseComment: lead.plannedPurchaseComment ?? '',
  };
}

export const EMPTY_LEAD_FORM: LeadFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  messengerType: '',
  messengerContact: '',
  additionalContactInfo: '',
  firstContactDate: toInputDate(new Date().toISOString()),
  sourceId: '',
  contactReason: '',
  managerNotes: '',
  interestedTariffId: '',
  temperature: Temperature.UNDEFINED,
  vehicleInterestType: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleBudget: '',
  vehicleComment: '',
  plannedPurchasePeriodText: '',
  plannedPurchaseDate: '',
  plannedPurchaseComment: '',
};

/** Converts form state into the API payload shape, omitting empty optional fields. */
export function leadFormToPayload(values: LeadFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    firstContactDate: new Date(values.firstContactDate).toISOString(),
    sourceId: values.sourceId,
    temperature: values.temperature,
  };
  if (values.messengerType) payload.messengerType = values.messengerType;
  if (values.messengerContact) payload.messengerContact = values.messengerContact;
  if (values.additionalContactInfo) payload.additionalContactInfo = values.additionalContactInfo;
  if (values.contactReason) payload.contactReason = values.contactReason;
  if (values.managerNotes) payload.managerNotes = values.managerNotes;
  if (values.interestedTariffId) payload.interestedTariffId = values.interestedTariffId;
  if (values.plannedPurchasePeriodText) payload.plannedPurchasePeriodText = values.plannedPurchasePeriodText;
  if (values.plannedPurchaseDate) {
    payload.plannedPurchaseDate = new Date(values.plannedPurchaseDate).toISOString();
  }
  if (values.plannedPurchaseComment) payload.plannedPurchaseComment = values.plannedPurchaseComment;

  if (values.vehicleInterestType) {
    payload.vehicleInterest = {
      interestType: values.vehicleInterestType,
      ...(values.vehicleMake && { make: values.vehicleMake }),
      ...(values.vehicleModel && { model: values.vehicleModel }),
      ...(values.vehicleYear && { year: Number(values.vehicleYear) }),
      ...(values.vehicleBudget && { budget: Number(values.vehicleBudget) }),
      ...(values.vehicleComment && { comment: values.vehicleComment }),
    };
  }
  return payload;
}

interface LeadFormProps {
  initialValues: LeadFormValues;
  sources: LeadSource[];
  tariffs: Tariff[];
  onSubmit: (values: LeadFormValues) => Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
}

export function LeadForm({
  initialValues,
  sources,
  tariffs,
  onSubmit,
  submitLabel,
  isSubmitting,
}: LeadFormProps) {
  const [values, setValues] = useState(initialValues);

  function setField<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Контактные данные</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" required>
            <Input value={values.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
          </Field>
          <Field label="Фамилия" required>
            <Input value={values.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
          </Field>
          <Field label="Телефон" required>
            <Input value={values.phone} onChange={(e) => setField('phone', e.target.value)} required />
          </Field>
          <Field label="Мессенджер">
            <Select value={values.messengerType} onChange={(e) => setField('messengerType', e.target.value)}>
              <option value="">Не указан</option>
              {Object.entries(MESSENGER_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Контакт в мессенджере">
            <Input
              value={values.messengerContact}
              onChange={(e) => setField('messengerContact', e.target.value)}
            />
          </Field>
          <Field label="Доп. контактные данные">
            <Input
              value={values.additionalContactInfo}
              onChange={(e) => setField('additionalContactInfo', e.target.value)}
            />
          </Field>
          <Field label="Дата первого обращения" required>
            <Input
              type="date"
              value={values.firstContactDate}
              onChange={(e) => setField('firstContactDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Источник" required>
            <Select value={values.sourceId} onChange={(e) => setField('sourceId', e.target.value)} required>
              <option value="">Выберите источник</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Температура лида">
            <Select value={values.temperature} onChange={(e) => setField('temperature', e.target.value)}>
              {Object.entries(TEMPERATURE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Потребность клиента</legend>
        <Field label="Зачем обратился / что беспокоит / основной вопрос">
          <Textarea
            value={values.contactReason}
            onChange={(e) => setField('contactReason', e.target.value)}
            rows={2}
          />
        </Field>
        <Field label="Комментарий менеджера">
          <Textarea
            value={values.managerNotes}
            onChange={(e) => setField('managerNotes', e.target.value)}
            rows={2}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Интерес к автомобилю (необязательно)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тип интереса">
            <Select
              value={values.vehicleInterestType}
              onChange={(e) => setField('vehicleInterestType', e.target.value)}
            >
              <option value="">Не указано</option>
              {Object.entries(INTEREST_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Марка">
            <Input value={values.vehicleMake} onChange={(e) => setField('vehicleMake', e.target.value)} />
          </Field>
          <Field label="Модель">
            <Input value={values.vehicleModel} onChange={(e) => setField('vehicleModel', e.target.value)} />
          </Field>
          <Field label="Год">
            <Input
              type="number"
              min={MIN_CAR_YEAR}
              max={MAX_CAR_YEAR}
              step={1}
              value={values.vehicleYear}
              onChange={(e) => setField('vehicleYear', e.target.value)}
            />
          </Field>
          <Field label="Бюджет">
            <Input
              type="number"
              min={0}
              value={values.vehicleBudget}
              onChange={(e) => setField('vehicleBudget', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Комментарий клиента об автомобиле">
          <Textarea
            value={values.vehicleComment}
            onChange={(e) => setField('vehicleComment', e.target.value)}
            rows={2}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Тариф и планируемая покупка</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Интересующий тариф">
            <Select
              value={values.interestedTariffId}
              onChange={(e) => setField('interestedTariffId', e.target.value)}
            >
              <option value="">Не выбран</option>
              {tariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Период (например, «через 2 месяца»)">
            <Input
              value={values.plannedPurchasePeriodText}
              onChange={(e) => setField('plannedPurchasePeriodText', e.target.value)}
            />
          </Field>
          <Field label="Планируемая дата покупки">
            <Input
              type="date"
              value={values.plannedPurchaseDate}
              onChange={(e) => setField('plannedPurchaseDate', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Комментарий о планируемой покупке">
          <Textarea
            value={values.plannedPurchaseComment}
            onChange={(e) => setField('plannedPurchaseComment', e.target.value)}
            rows={2}
          />
        </Field>
      </fieldset>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Сохраняем…' : submitLabel}
      </Button>
    </form>
  );
}
