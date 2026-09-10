// Access token is kept in memory only (never localStorage) to limit XSS blast
// radius. It is lost on a hard page reload — App bootstraps by silently calling
// /auth/refresh (the httpOnly cookie survives reloads) to get a fresh one; see
// AuthProvider. This is the documented online-only tradeoff from the plan.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
