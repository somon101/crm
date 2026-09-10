import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type FieldDiff = Record<string, { old: unknown; new: unknown }>;

export interface RecordAuditParams {
  entityType: string;
  entityId: string;
  leadId?: string | null;
  action: AuditAction;
  changes: FieldDiff | Record<string, never>;
  changedByUserId?: string | null;
  /** Pass an existing transaction client to keep the audit row atomic with its mutation. */
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Shallow-diffs two plain objects, keeping only fields whose value actually
   * changed. Used to build the `changes` JSON blob for AuditLog entries. */
  buildDiff<T extends Record<string, unknown>>(before: T, after: Partial<T>): FieldDiff {
    const diff: FieldDiff = {};
    for (const key of Object.keys(after)) {
      const oldValue = before[key];
      const newValue = after[key as keyof T];
      if (!this.isEqual(oldValue, newValue)) {
        diff[key] = { old: oldValue ?? null, new: newValue ?? null };
      }
    }
    return diff;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a instanceof Date || b instanceof Date) {
      return new Date(a as any).getTime() === new Date(b as any).getTime();
    }
    if (a && typeof a === 'object' && 'toNumber' in (a as any)) {
      // Prisma.Decimal
      return (a as any).toString() === (b as any)?.toString();
    }
    return a === b;
  }

  async record(params: RecordAuditParams): Promise<void> {
    if (Object.keys(params.changes).length === 0 && params.action === AuditAction.UPDATE) {
      return; // nothing actually changed — don't pollute the timeline
    }
    const client = params.tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        leadId: params.leadId ?? null,
        action: params.action,
        changes: params.changes as Prisma.InputJsonValue,
        changedByUserId: params.changedByUserId ?? null,
      },
    });
  }
}
