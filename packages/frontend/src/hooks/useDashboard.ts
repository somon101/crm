import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { AdminDashboard, ManagerDashboard } from '../types';

export function useManagerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: async () => {
      const res = await apiClient.get<ManagerDashboard>('/dashboard/manager');
      return res.data;
    },
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const res = await apiClient.get<AdminDashboard>('/dashboard/admin');
      return res.data;
    },
  });
}

export function useManagerDrilldown(managerId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'admin', 'manager', managerId],
    queryFn: async () => {
      const res = await apiClient.get<ManagerDashboard>(`/dashboard/admin/managers/${managerId}`);
      return res.data;
    },
    enabled: !!managerId,
  });
}
