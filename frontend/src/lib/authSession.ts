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
