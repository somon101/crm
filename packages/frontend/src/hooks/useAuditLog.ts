import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  leadId: string | null;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
  changedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

export function useAuditLog(filters: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AuditLogEntry[]; total: number }>('/audit-log', {
        params: filters,
      });
      return res.data;
    },
  });
}
