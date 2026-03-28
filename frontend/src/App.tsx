import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { LegacyTaskRedirect } from "./pages/LegacyTaskRedirect";
import { TaskDetailPage } from "./pages/TaskDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks/:task_id" element={<TaskDetailPage />} />
          <Route path="/task/:id" element={<LegacyTaskRedirect />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
