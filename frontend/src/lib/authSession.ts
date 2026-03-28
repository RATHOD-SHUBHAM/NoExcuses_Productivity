import type { Session, SupabaseClient } from "@supabase/supabase-js";

type SessionWithToken = Session & {
  user: NonNullable<Session["user"]>;
  access_token: string;
};

/** True only when we can attach Authorization: Bearer to API calls. */
export function isAuthenticatedSession(
  session: Session | null,
): session is SessionWithToken {
  return Boolean(
    session?.user &&
      typeof session.access_token === "string" &&
      session.access_token.length > 0,
  );
}

/** Ref kept in sync during AuthProvider render so API calls use the same token as the route guard (avoids child useEffect vs parent timing races). */
export type ApiSessionRef = { current: Session | null };

let apiSessionRef: ApiSessionRef | null = null;

export function bindApiSessionRef(ref: ApiSessionRef): void {
  apiSessionRef = ref;
}

export function clearApiSessionRef(): void {
  apiSessionRef = null;
}

/** Synchronous read — must be called after AuthProvider has mounted. */
export function getAccessTokenForApi(): string | null {
  const s = apiSessionRef?.current ?? null;
  if (!isAuthenticatedSession(s)) {
    return null;
  }
  return s.access_token;
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
