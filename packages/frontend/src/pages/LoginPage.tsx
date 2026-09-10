import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setError('Неверный email или пароль');
      } else {
        setError('Не удалось войти. Попробуйте ещё раз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="mb-1 text-lg font-semibold">CRM · Автодиагностика</h1>
        <p className="mb-6 text-sm text-muted-foreground">Войдите, чтобы продолжить</p>

        {!isOnline && (
          <p className="mb-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            Нет соединения с интернетом
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          <Field label="Email" required>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Пароль" required>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={isSubmitting || !isOnline}>
            {isSubmitting ? 'Входим…' : 'Войти'}
          </Button>
        </div>
      </form>
    </div>
  );
}
