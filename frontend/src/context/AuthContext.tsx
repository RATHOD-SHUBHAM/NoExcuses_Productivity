import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  // During render (not useEffect): child effects run before parent effects, so the API
  // layer must see the token before HomePage’s first fetch.
  bindApiSessionRef(sessionRef);
  bindApiAccessTokenRef(accessTokenRef);

  useEffect(() => {
    return () => clearApiSessionRef();
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Callback must stay synchronous: calling refreshSession/signOut inside it can deadlock
    // (Supabase holds a lock). Defer normalize to a microtask.
    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      if (cancelled) {
        return;
      }

      if (event === "INITIAL_SESSION") {
        queueMicrotask(() => {
          void (async () => {
            if (cancelled) {
              return;
            }
            try {
              const s = await normalizeStoredSession(sb, next);
              if (!cancelled) {
                setSession(s);
              }
            } catch {
              if (!cancelled) {
                setSession(null);
              }
            } finally {
              if (!cancelled) {
                setLoading(false);
              }
            }
          })();
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
          if (!cancelled) {
            setSession(s);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
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
