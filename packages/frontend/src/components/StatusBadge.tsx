import { Badge } from './ui/Badge';
import type { LeadStatus } from '../types';

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge style={status.color ? { borderColor: status.color, color: status.color } : undefined}>
      {status.name}
    </Badge>
  );
}

const TEMPERATURE_LABEL: Record<string, string> = {
  HOT: 'Горячий',
  WARM: 'Тёплый',
  COLD: 'Холодный',
  UNDEFINED: 'Не определена',
};

const TEMPERATURE_COLOR: Record<string, string> = {
  HOT: '#ef4444',
  WARM: '#f59e0b',
  COLD: '#3b82f6',
  UNDEFINED: '#94a3b8',
};

export function TemperatureBadge({ temperature }: { temperature: string }) {
  return (
    <Badge style={{ borderColor: TEMPERATURE_COLOR[temperature], color: TEMPERATURE_COLOR[temperature] }}>
      {TEMPERATURE_LABEL[temperature] ?? temperature}
    </Badge>
  );
}
