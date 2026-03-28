import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { initAuthDebugFromUrl } from "./lib/authTrace";
import {
  logBackendSupabaseAlignment,
  logDeployEnvDiagnostics,
} from "./lib/publicEnv";
import { loadRuntimePublicConfigOnce } from "./lib/runtimePublicConfig";

import "./index.css";
import App from "./App";

async function bootstrap(): Promise<void> {
  initAuthDebugFromUrl();
  await loadRuntimePublicConfigOnce();
  logDeployEnvDiagnostics();
  void logBackendSupabaseAlignment();

  const el = document.getElementById("root");
  if (!el) {
    throw new Error("Missing #root element in index.html");
  }

  createRoot(el).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
