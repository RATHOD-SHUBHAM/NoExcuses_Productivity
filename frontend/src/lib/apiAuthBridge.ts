/**
 * Keeps the Supabase access token in sync for API calls.
 * AuthProvider updates this on every render so child useEffects see the same
 * token as React state (avoids racing getSession() before the client finishes hydrating).
 */
let accessToken: string | null = null;

export function setApiAccessToken(token: string | null): void {
  const t = token?.trim() ?? "";
  accessToken = t.length > 0 ? t : null;
}

export function getApiAccessToken(): string | null {
  return accessToken;
}
