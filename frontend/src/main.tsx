import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { logDeployEnvDiagnostics } from "./lib/publicEnv";
import "./index.css";
import App from "./App";

logDeployEnvDiagnostics();

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
