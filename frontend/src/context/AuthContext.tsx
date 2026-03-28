import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { traceAuth } from "../lib/authTrace";
import { getSupabase } from "../lib/supabaseClient";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      traceAuth("AuthProvider: no Supabase client (missing URL/key in env)");
      setLoading(false);
      return;
    }

    traceAuth("AuthProvider: initializing getSession + onAuthStateChange");

    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        traceAuth("AuthProvider: safety timeout (5s) — forcing loading false");
        setLoading(false);
      }
    }, 5000);

    void sb.auth
      .getSession()
      .then(async ({ data: { session: s }, error }) => {
        if (cancelled) return;
        if (error) {
          traceAuth("AuthProvider: getSession error", { message: error.message });
          setSession(null);
          return;
        }
        const hasToken = Boolean(s?.access_token?.trim());
        traceAuth("AuthProvider: getSession done", {
          hasSession: Boolean(s),
          hasToken,
          hasUser: Boolean(s?.user),
        });
        if (s?.user && !s.access_token?.trim()) {
          traceAuth("AuthProvider: corrupt session (user without token) → signOut");
          await sb.auth.signOut();
          setSession(null);
        } else {
          setSession(s ?? null);
        }
      })
      .catch((e: unknown) => {
        traceAuth("AuthProvider: getSession threw", {
          message: e instanceof Error ? e.message : String(e),
        });
        if (!cancelled) {
          setSession(null);
        }
      })
      .finally(() => {
        window.clearTimeout(safety);
        if (!cancelled) {
          setLoading(false);
        }
      });

    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      traceAuth("AuthProvider: onAuthStateChange", {
        event,
        hasSession: Boolean(next),
        hasToken: Boolean(next?.access_token?.trim()),
      });
      if (!cancelled) setSession(next);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo(
    () => ({ session, loading, signOut }),
    [session, loading, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
