import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageBackdrop } from "../components/layout/PageBackdrop";
import { SiteFooter } from "../components/layout/SiteFooter";
import { inputBase } from "../lib/ui";
import { getSupabase, isSupabaseConfigured } from "../lib/supabaseClient";

export function AuthPage() {
  const { session, loading } = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="relative flex min-h-dvh flex-col font-sans text-zinc-100">
        <PageBackdrop />
        <main className="relative z-0 mx-auto max-w-md flex-1 px-4 py-16">
          <h1 className="text-lg font-semibold text-zinc-100">Setup needed</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Vite only reads a real{" "}
            <code className="text-zinc-300">.env</code> file — not{" "}
            <code className="text-zinc-300">.env.example</code>. Add{" "}
            <code className="text-zinc-300">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-zinc-300">VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code className="text-zinc-300">frontend/.env</code>{" "}
            <span className="text-zinc-500">or</span> the repo root{" "}
            <code className="text-zinc-300">.env</code> (same values as{" "}
            <code className="text-zinc-300">SUPABASE_URL</code> / publishable{" "}
            <code className="text-zinc-300">SUPABASE_KEY</code>), then restart{" "}
            <code className="text-zinc-300">npm run dev</code>.
          </p>
          <p className="mt-3 text-xs text-zinc-600">
            Quick start:{" "}
            <code className="text-zinc-400">cp frontend/.env.example frontend/.env</code>{" "}
            and edit the placeholders.
          </p>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative flex min-h-dvh flex-col font-sans text-zinc-100">
        <PageBackdrop />
        <main className="relative z-0 flex flex-1 items-center justify-center text-sm text-zinc-400">
          Loading…
        </main>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase is not configured");
      if (register) {
        const { error: err } = await sb.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        setMessage(
          "Check your email if your project asks you to confirm, then log in.",
        );
      } else {
        const { error: err } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden font-sans text-zinc-100 antialiased selection:bg-rose-500/30 selection:text-white">
      <PageBackdrop />
      <main className="relative z-0 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[340px]">
          <h1 className="font-display text-center text-3xl font-normal tracking-tight text-white sm:text-4xl">
            NoExcuses
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            {register ? "Create your account" : "Log in to track your habits"}
          </p>

          <form
            onSubmit={(ev) => void submit(ev)}
            className="mt-8 flex flex-col gap-4"
          >
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-950/35 px-3 py-2.5 text-center text-sm text-red-100"
              >
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-3 py-2.5 text-center text-sm text-emerald-100">
                {message}
              </p>
            ) : null}

            <div>
              <label
                htmlFor="auth-email"
                className="sr-only"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-12 w-full px-4 text-base text-zinc-100 placeholder:text-zinc-500 ${inputBase}`}
              />
            </div>
            <div>
              <label
                htmlFor="auth-password"
                className="sr-only"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={6}
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-12 w-full px-4 text-base text-zinc-100 placeholder:text-zinc-500 ${inputBase}`}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-rose-600 text-base font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? "Please wait…" : register ? "Create account" : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-300 hover:underline"
              onClick={() => {
                setRegister(!register);
                setError(null);
                setMessage(null);
              }}
            >
              {register
                ? "Already have an account? Log in"
                : "New here? Create an account"}
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
