import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import {
  useActivateUser,
  useBlockUser,
  useCreateUser,
  useResetPassword,
  useUpdateUser,
  useUsers,
} from '../hooks/useUsers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Field } from '../components/ui/Field';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import type { SafeUser } from '../types';

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'MANAGER';
  }>({ email: '', password: '', firstName: '', lastName: '', role: 'MANAGER' });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser.mutateAsync(form);
      onOpenChange(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'MANAGER' });
    } catch (err) {
      setError(err instanceof AxiosError ? (err.response?.data?.message ?? 'Ошибка') : 'Ошибка');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Новый пользователь">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя" required>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </Field>
          <Field label="Фамилия" required>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Пароль" required>
          <Input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label="Роль">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'MANAGER' | 'ADMIN' })}>
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Администратор</option>
          </Select>
        </Field>
        <Button type="submit" disabled={createUser.isPending}>
          Создать
        </Button>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await resetPassword.mutateAsync({ id: userId, newPassword: password });
    setDone(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setPassword('');
          setDone(false);
        }
      }}
      title="Сбросить пароль"
    >
      {done ? (
        <p className="text-sm">Пароль обновлён. Сообщите его пользователю.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Новый пароль" required>
            <Input
              type="text"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={resetPassword.isPending}>
            Сохранить
          </Button>
        </form>
      )}
    </Dialog>
  );
}

function UserRow({ user, onResetPassword }: { user: SafeUser; onResetPassword: (id: string) => void }) {
  const blockUser = useBlockUser();
  const activateUser = useActivateUser();
  const updateUser = useUpdateUser();

  return (
    <div
      data-testid={`user-row-${user.email}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium">
          {user.firstName} {user.lastName}{' '}
          <Badge className={user.isActive ? '' : 'border-destructive text-destructive'}>
            {user.isActive ? 'Активен' : 'Заблокирован'}
          </Badge>
        </p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={user.role}
          className="w-40"
          onChange={(e) => updateUser.mutate({ id: user.id, role: e.target.value })}
        >
          <option value="MANAGER">Менеджер</option>
          <option value="ADMIN">Администратор</option>
        </Select>
        <Button size="sm" variant="outline" onClick={() => onResetPassword(user.id)}>
          Сбросить пароль
        </Button>
        {user.isActive ? (
          <Button size="sm" variant="destructive" onClick={() => blockUser.mutate(user.id)}>
            Заблокировать
          </Button>
        ) : (
          <Button size="sm" onClick={() => activateUser.mutate(user.id)}>
            Активировать
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { data: users, isLoading } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Пользователи</h1>
        <Button onClick={() => setCreateOpen(true)}>Новый пользователь</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users?.map((u) => (
            <UserRow key={u.id} user={u} onResetPassword={setResetTarget} />
          ))}
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResetPasswordDialog userId={resetTarget} open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)} />
    </div>
  );
}
