import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Lead, Paginated, TimelineEntry } from '../types';

export interface LeadFilters {
  search?: string;
  managerId?: string;
  statusId?: string;
  temperature?: string;
  sourceId?: string;
  tariffId?: string;
  result?: string;
  limit?: number;
  offset?: number;
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Lead>>('/leads', { params: filters });
      return res.data;
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const res = await apiClient.get<Lead>(`/leads/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useLeadTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id, 'timeline'],
    queryFn: async () => {
      const res = await apiClient.get<TimelineEntry[]>(`/leads/${id}/timeline`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiClient.post<Lead>('/leads', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiClient.patch<Lead>(`/leads/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', id] });
      queryClient.invalidateQueries({ queryKey: ['leads', id, 'timeline'] });
    },
  });
}

export function useReassignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, managerId }: { id: string; managerId: string }) => {
      const res = await apiClient.post<Lead>(`/leads/${id}/reassign`, { managerId });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', variables.id] });
    },
  });
}

export function useAddInteraction(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; comment: string; occurredAt?: string }) => {
      const res = await apiClient.post(`/leads/${leadId}/interactions`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'timeline'] });
    },
  });
}
