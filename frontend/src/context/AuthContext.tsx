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
      setLoading(false);
      return;
    }

    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    void sb.auth
      .getSession()
      .then(async ({ data: { session: s } }) => {
        if (cancelled) return;
        if (s?.user && !s.access_token?.trim()) {
          await sb.auth.signOut();
          setSession(null);
        } else {
          setSession(s ?? null);
        }
      })
      .finally(() => {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
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
