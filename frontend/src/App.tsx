import { useEffect, useRef } from "react";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useNavigate,
} from "react-router-dom";
import { ApiConfigBanner } from "./components/ApiConfigBanner";
import { AuthTraceHud } from "./components/AuthTraceHud";
import { DeployConfigBlocker } from "./components/DeployConfigBlocker";
import { AppShell } from "./components/layout/AppShell";
import { PageBackdrop } from "./components/layout/PageBackdrop";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getProductionSupabaseConfigIssues } from "./lib/publicEnv";
import { traceAuth } from "./lib/authTrace";
import { HomePage } from "./pages/HomePage";
import { LegacyTaskRedirect } from "./pages/LegacyTaskRedirect";
import { AuthPage } from "./pages/AuthPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";

/** Renders child routes only — required so `/login` and the protected tree are siblings under `/` (RR7). */
function RootLayout() {
  return <Outlet />;
}

function ProtectedLayout() {
  const navigate = useNavigate();
  const { session, loading, signOut } = useAuth();
  const layoutTrace = useRef<string>("");
  const token = session?.access_token?.trim() ?? "";

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [loading, token, navigate]);

  useEffect(() => {
    const key = loading
      ? "loading"
      : !token
        ? "redirect-login"
        : "shell";
    if (layoutTrace.current === key) {
      return;
    }
    layoutTrace.current = key;
    if (key === "loading") {
      traceAuth("ProtectedLayout: waiting for auth session");
    } else if (key === "redirect-login") {
      traceAuth("ProtectedLayout: no access_token → redirect /login");
    } else {
      traceAuth("ProtectedLayout: rendering app shell", {
        email: session?.user?.email ?? null,
      });
    }
  }, [loading, token, session?.user?.email]);

  if (loading) {
    return (
      <div className="relative flex min-h-dvh flex-col font-sans text-zinc-100">
        <PageBackdrop />
        <div className="relative z-0 flex flex-1 items-center justify-center text-base text-zinc-200">
          Loading…
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="relative flex min-h-dvh flex-col font-sans text-zinc-100">
        <PageBackdrop />
        <div className="relative z-0 flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-zinc-300">
          <p>Opening sign-in…</p>
          <p className="max-w-sm text-xs text-zinc-500">
            If this never finishes, open{" "}
            <a
              href="/login"
              className="text-amber-200/90 underline underline-offset-2"
            >
              /login
            </a>{" "}
            (full page load) and check the console for{" "}
            <code className="text-zinc-400">[NoExcuses Auth]</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      userEmail={session?.user?.email ?? undefined}
      onSignOut={() => void signOut()}
    >
      <Outlet />
    </AppShell>
  );
}

/**
 * RR7: top-level `path: "/login"` next to `path: "/"` can fail to match in production builds.
 * Nest `login` + protected app as children of `path: "/"` + `<Outlet/>` so `/login` always resolves.
 */
const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { path: "login", element: <AuthPage /> },
      {
        path: "",
        element: <ProtectedLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "tasks/:task_id", element: <TaskDetailPage /> },
          { path: "task/:id", element: <LegacyTaskRedirect /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  const supabaseIssues = getProductionSupabaseConfigIssues();
  if (supabaseIssues.length > 0) {
    traceAuth("App: blocking UI — Supabase env missing (login impossible)", {
      count: supabaseIssues.length,
    });
    return (
      <DeployConfigBlocker
        issues={supabaseIssues}
        deploySha={import.meta.env.VITE_DEPLOY_SHA}
      />
    );
  }

  return (
    <AuthProvider>
      <ApiConfigBanner />
      <RouterProvider router={appRouter} />
      <AuthTraceHud />
    </AuthProvider>
  );
}
