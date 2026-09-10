import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { LeadSource, LeadStatus, LossReason, Tariff } from '../types';

// The four reference-data resources (Tariffs/Statuses/Sources/LossReasons) share an
// identical CRUD + activate/deactivate shape on the frontend, so one small factory
// avoids repeating the same five hooks four times over.
function makeResourceHooks<T extends { id: string }>(endpoint: string, queryKey: string) {
  function useList() {
    return useQuery({
      queryKey: [queryKey],
      queryFn: async () => (await apiClient.get<T[]>(`/${endpoint}`)).data,
    });
  }
  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: Record<string, unknown>) =>
        (await apiClient.post<T>(`/${endpoint}`, payload)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    });
  }
  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
        (await apiClient.patch<T>(`/${endpoint}/${id}`, payload)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    });
  }
  function useSetActive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
        (await apiClient.post<T>(`/${endpoint}/${id}/${active ? 'activate' : 'deactivate'}`)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    });
  }
  return { useList, useCreate, useUpdate, useSetActive };
}

export const tariffsApi = makeResourceHooks<Tariff>('tariffs', 'tariffs');
export const leadStatusesApi = makeResourceHooks<LeadStatus>('lead-statuses', 'lead-statuses');
export const leadSourcesApi = makeResourceHooks<LeadSource>('lead-sources', 'lead-sources');
export const lossReasonsApi = makeResourceHooks<LossReason>('loss-reasons', 'loss-reasons');
