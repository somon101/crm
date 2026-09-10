import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@crm/shared';
import { useAuth } from '../lib/auth-context';

// Client-side convenience only — the backend re-checks the role on every request.
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (user && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
