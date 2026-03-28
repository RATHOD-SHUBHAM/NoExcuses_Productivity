import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PageBackdrop } from "./components/layout/PageBackdrop";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HomePage } from "./pages/HomePage";
import { LegacyTaskRedirect } from "./pages/LegacyTaskRedirect";
import { AuthPage } from "./pages/AuthPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";

function ProtectedLayout() {
  const { session, loading, signOut } = useAuth();

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

  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell
      userEmail={session.user.email ?? undefined}
      onSignOut={() => void signOut()}
    >
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
