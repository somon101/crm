import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../ui/Button';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { cn } from '../../lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
  );

export function AppShell() {
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();

  return (
    <div className="flex min-h-screen flex-col">
      {!isOnline && (
        <div className="bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground">
          Нет соединения с интернетом — действия недоступны, пока связь не восстановится
        </div>
      )}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold">CRM · Автодиагностика</span>
            <span className="text-xs text-muted-foreground sm:hidden">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            <NavLink to="/dashboard" className={navLinkClass} end>
              Дашборд
            </NavLink>
            <NavLink to="/leads" className={navLinkClass}>
              Лиды
            </NavLink>
            <NavLink to="/tasks" className={navLinkClass}>
              Задачи
            </NavLink>
            {user?.role === 'ADMIN' && (
              <>
                <NavLink to="/admin/users" className={navLinkClass}>
                  Пользователи
                </NavLink>
                <NavLink to="/admin/settings" className={navLinkClass}>
                  Настройки
                </NavLink>
                <NavLink to="/admin/audit-log" className={navLinkClass}>
                  История
                </NavLink>
              </>
            )}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-xs text-muted-foreground">
              {user?.firstName} {user?.lastName} · {user?.role === 'ADMIN' ? 'Админ' : 'Менеджер'}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <div className="border-t border-border bg-card px-4 py-2 text-center sm:hidden">
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          Выйти
        </Button>
      </div>
    </div>
  );
}
