import axios, { AxiosError } from 'axios';
import { getAccessToken, setAccessToken } from './token-store';
import type { SafeUser } from '../types';

export const AUTH_EXPIRED_EVENT = 'auth:expired';

// In local dev, Vite's own dev-server proxy forwards relative /api requests to the
// backend (see vite.config.ts), so frontend and backend appear same-origin and no
// env var is needed. In production the two are genuinely different origins (e.g.
// a GitHub Pages domain calling a Railway/Render backend), so the full backend URL
// must be baked in at build time via VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RefreshResult {
  accessToken: string;
  user: SafeUser;
}

let refreshPromise: Promise<RefreshResult> | null = null;

/** The single entry point for POST /auth/refresh. Every caller (the initial
 * session bootstrap on page load AND the 401-retry interceptor below) must go
 * through this shared, coalesced promise — issuing two concurrent refresh calls
 * with the same not-yet-rotated cookie trips the backend's reuse-detection and
 * revokes the whole session. React StrictMode's double-effect-invocation on
 * mount is exactly this scenario, so this isn't just a theoretical race. */
export function refreshSession(): Promise<RefreshResult> {
  refreshPromise ??= axios
    .post<RefreshResult>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthRoute) {
      originalRequest._retried = true;
      try {
        const { accessToken } = await refreshSession();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
