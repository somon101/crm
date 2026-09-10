import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RequireRole } from './routes/RequireRole';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ManagerDrilldownPage } from './pages/ManagerDrilldownPage';
import { LeadsListPage } from './pages/LeadsListPage';
import { LeadCreatePage } from './pages/LeadCreatePage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { TasksPage } from './pages/TasksPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminAuditLogPage } from './pages/AdminAuditLogPage';

function DashboardRouter() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminDashboardPage /> : <ManagerDashboardPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/leads" element={<LeadsListPage />} />
          <Route path="/leads/new" element={<LeadCreatePage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
            <Route path="/admin/managers/:id" element={<ManagerDrilldownPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* HashRouter, not BrowserRouter: GitHub Pages is pure static hosting with no
          server-side rewrite for SPA deep links (a direct visit to /leads/:id would
          404). Hash routing (/#/leads/:id) needs no server cooperation at all. */}
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}
