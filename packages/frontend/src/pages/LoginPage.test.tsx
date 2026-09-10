import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../lib/auth-context';

const post = vi.fn();

vi.mock('../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => post(...args), get: vi.fn() },
  AUTH_EXPIRED_EVENT: 'auth:expired',
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  post.mockReset();
  // Bootstrap silent refresh on mount always fails in these tests (no session).
  post.mockRejectedValue(new AxiosError('no session', '401'));
});

describe('LoginPage', () => {
  it('renders the login form', async () => {
    renderLoginPage();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('shows a Russian error message on a wrong-password 401', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByLabelText(/email/i);

    post.mockRejectedValueOnce(
      Object.assign(new AxiosError('Unauthorized'), { response: { status: 401 } }),
    );

    await user.type(screen.getByLabelText(/email/i), 'wrong@test.local');
    await user.type(screen.getByLabelText(/пароль/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Неверный email или пароль')).toBeInTheDocument();
  });

  it('calls the login endpoint with the entered credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByLabelText(/email/i);

    post.mockResolvedValueOnce({
      data: {
        accessToken: 'token',
        user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'MANAGER' },
      },
    });

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/пароль/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'Password123!' }),
    );
  });
});
