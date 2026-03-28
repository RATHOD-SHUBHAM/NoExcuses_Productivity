import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { initAuthDebugFromUrl } from "./lib/authTrace";
import {
  logBackendSupabaseAlignment,
  logDeployEnvDiagnostics,
} from "./lib/publicEnv";

initAuthDebugFromUrl();
import "./index.css";
import App from "./App";

logDeployEnvDiagnostics();
void logBackendSupabaseAlignment();

const el = document.getElementById("root");
if (!el) {
  throw new Error('Missing #root element in index.html');
}

createRoot(el).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
