/**
 * Fetch wrapper for the Laundry Dashboard API.
 *
 * Manages access/refresh tokens in module-level variables (in-memory only for
 * security). Automatically attaches Authorization headers and handles 401s by
 * attempting a silent token refresh before retrying the original request.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Called by AuthProvider to keep the fetch wrapper in sync. */
export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
}

/** Clear tokens on logout or refresh failure. */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

/** Expose current access token (used by socket connection). */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Authenticated fetch wrapper.
 *
 * - Attaches Bearer token to every request.
 * - On 401, attempts POST /api/auth/refresh.
 * - If refresh succeeds, retries the original request once.
 * - If refresh fails, clears tokens and redirects to /login.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && refreshToken) {
    // Attempt silent refresh
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;

      // Persist new refresh token in sessionStorage for page-reload recovery
      sessionStorage.setItem('refreshToken', data.refreshToken);

      // Retry original request with new token
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${accessToken}`);
      if (!retryHeaders.has('Content-Type') && options.body && typeof options.body === 'string') {
        retryHeaders.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers: retryHeaders });
    }

    // Refresh failed — force logout
    clearTokens();
    sessionStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return response;
  }

  return response;
}
