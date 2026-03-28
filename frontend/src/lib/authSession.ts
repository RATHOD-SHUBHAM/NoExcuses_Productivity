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
