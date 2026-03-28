import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
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

function ProtectedLayout() {
  const { session, loading, signOut } = useAuth();
  const layoutTrace = useRef<string>("");

  useEffect(() => {
    const token = session?.access_token?.trim() ?? "";
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
  }, [loading, session?.access_token, session?.user?.email]);

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

  if (!session?.access_token?.trim()) {
    return <Navigate to="/login" replace />;
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
    <BrowserRouter>
      <AuthProvider>
        <ApiConfigBanner />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          {/*
            Explicit path="/" parent so / and /tasks/... match reliably (RR v7).
            A pathless layout + index often renders an empty <Outlet /> → black screen.
          */}
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<HomePage />} />
            <Route path="tasks/:task_id" element={<TaskDetailPage />} />
            <Route path="task/:id" element={<LegacyTaskRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AuthTraceHud />
      </AuthProvider>
    </BrowserRouter>
  );
}
