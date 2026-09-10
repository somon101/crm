// Mirrors packages/backend/prisma/schema.prisma enums. Kept as plain string unions
// (not imported from @prisma/client) so the frontend never depends on Prisma.

export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Temperature = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
  UNDEFINED: 'UNDEFINED',
} as const;
export type Temperature = (typeof Temperature)[keyof typeof Temperature];

export const MessengerType = {
  WHATSAPP: 'WHATSAPP',
  TELEGRAM: 'TELEGRAM',
  VIBER: 'VIBER',
  INSTAGRAM_DM: 'INSTAGRAM_DM',
  OTHER: 'OTHER',
} as const;
export type MessengerType = (typeof MessengerType)[keyof typeof MessengerType];

export const VehicleInterestType = {
  SPECIFIC_CAR: 'SPECIFIC_CAR',
  SPECIFIC_MODEL: 'SPECIFIC_MODEL',
  SEVERAL_MODELS: 'SEVERAL_MODELS',
  UNDECIDED: 'UNDECIDED',
} as const;
export type VehicleInterestType = (typeof VehicleInterestType)[keyof typeof VehicleInterestType];

export const ContactType = {
  CALL: 'CALL',
  MESSAGE: 'MESSAGE',
  MEETING: 'MEETING',
  OTHER: 'OTHER',
} as const;
export type ContactType = (typeof ContactType)[keyof typeof ContactType];

export const TaskStatus = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const InteractionType = {
  CALL: 'CALL',
  MESSAGE: 'MESSAGE',
  MEETING: 'MEETING',
  COMMENT: 'COMMENT',
  OTHER: 'OTHER',
} as const;
export type InteractionType = (typeof InteractionType)[keyof typeof InteractionType];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  REASSIGN: 'REASSIGN',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
