import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  bindApiAccessTokenRef,
  bindApiSessionRef,
  clearApiSessionRef,
  effectiveAccessToken,
  isAuthenticatedSession,
  normalizeStoredSession,
} from "../lib/authSession";
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
  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = effectiveAccessToken(session);

  useLayoutEffect(() => {
    bindApiSessionRef(sessionRef);
    bindApiAccessTokenRef(accessTokenRef);
    return () => clearApiSessionRef();
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadingDeadline = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 5000);

    const clearDeadline = () => {
      window.clearTimeout(loadingDeadline);
    };

    // getSession can return null before storage finishes hydrating; INITIAL_SESSION (below)
    // applies the real session. Do not ignore INITIAL_SESSION.
    void sb.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        try {
          if (error) throw error;
          const s = await normalizeStoredSession(sb, data.session ?? null);
          if (!cancelled) setSession(s);
        } catch {
          if (!cancelled) setSession(null);
        }
      })
      .finally(() => {
        clearDeadline();
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      if (cancelled) return;

      if (event === "INITIAL_SESSION") {
        queueMicrotask(() => {
          void normalizeStoredSession(sb, next).then((s) => {
            if (!cancelled) setSession(s);
          });
        });
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        return;
      }

      if (next === null) {
        setSession(null);
        return;
      }

      if (isAuthenticatedSession(next)) {
        setSession(next);
        return;
      }

      queueMicrotask(() => {
        void normalizeStoredSession(sb, next).then((s) => {
          if (!cancelled) setSession(s);
        });
      });
    });

    return () => {
      cancelled = true;
      clearDeadline();
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch {
      /* still signed out locally */
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
