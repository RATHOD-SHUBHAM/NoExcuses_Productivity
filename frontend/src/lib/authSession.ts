import type { Session, SupabaseClient } from "@supabase/supabase-js";

type SessionWithToken = Session & {
  user: NonNullable<Session["user"]>;
  access_token: string;
};

function rawAccessToken(session: Session | null): string {
  if (!session) return "";
  const s = session as Session & { accessToken?: string };
  const a = s.access_token;
  if (typeof a === "string" && a.length > 0) return a;
  const b = s.accessToken;
  if (typeof b === "string" && b.length > 0) return b;
  return "";
}

/**
 * JWT string if present — does NOT require `session.user`.
 * Supabase can briefly expose a token before `user` is hydrated; requiring `user` cleared the
 * runtime token while the route still showed the app, causing "Missing bearer" on every API call.
 */
export function sessionBearerToken(session: Session | null): string | null {
  const t = rawAccessToken(session).trim();
  return t.length > 0 ? t : null;
}

/** JWT for API calls when the user is present (same bar as route protection). */
export function effectiveAccessToken(session: Session | null): string | null {
  if (!session?.user) return null;
  const t = rawAccessToken(session);
  return t.length > 0 ? t : null;
}

/** True only when we can attach Authorization: Bearer to API calls. */
export function isAuthenticatedSession(
  session: Session | null,
): session is SessionWithToken {
  return Boolean(session?.user && rawAccessToken(session).length > 0);
}

/** Ref kept in sync during AuthProvider render so API calls use the same token as the route guard. */
export type ApiSessionRef = { current: Session | null };
export type ApiAccessTokenRef = { current: string | null };

let apiSessionRef: ApiSessionRef | null = null;
let apiAccessTokenRef: ApiAccessTokenRef | null = null;

/**
 * JWT mirrored from Auth state every render — tasksApi reads this first so fetch() always
 * matches the same session that passed the route guard (refs alone were unreliable after deploy).
 */
let runtimeAccessToken: string | null = null;

export function syncRuntimeAccessToken(token: string | null): void {
  runtimeAccessToken =
    typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

/** Prefer this from AuthProvider — always mirrors whatever JWT is on the session object. */
export function syncRuntimeAccessTokenFromSession(session: Session | null): void {
  syncRuntimeAccessToken(sessionBearerToken(session));
}

export function getRuntimeAccessToken(): string | null {
  return runtimeAccessToken;
}

export function bindApiSessionRef(ref: ApiSessionRef): void {
  apiSessionRef = ref;
}

/** String token only — avoids any shape mismatch on Session while routing. */
export function bindApiAccessTokenRef(ref: ApiAccessTokenRef): void {
  apiAccessTokenRef = ref;
}

export function clearApiSessionRef(): void {
  apiSessionRef = null;
  apiAccessTokenRef = null;
  runtimeAccessToken = null;
}

/** Synchronous read — updated every AuthProvider render before children run effects. */
export function getAccessTokenForApi(): string | null {
  const direct = apiAccessTokenRef?.current;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }
  const s = apiSessionRef?.current ?? null;
  const t = rawAccessToken(s);
  return t.length > 0 ? t : null;
}

/**
 * Drop corrupt persisted sessions (user without token). Try refresh once; else sign out.
 */
export async function normalizeStoredSession(
  sb: SupabaseClient,
  session: Session | null,
): Promise<Session | null> {
  if (!session) {
    return null;
  }
  if (isAuthenticatedSession(session)) {
    return session;
  }
  const { data, error } = await sb.auth.refreshSession();
  if (!error && data.session && isAuthenticatedSession(data.session)) {
    return data.session;
  }
  await sb.auth.signOut();
  return null;
}
