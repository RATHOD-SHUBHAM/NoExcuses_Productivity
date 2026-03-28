/**
 * FastAPI base URL (no trailing slash).
 * Note: Vite turns an unset var into ""; `??` does not fall back for "" — we normalize so
 * requests don't accidentally hit the Vite dev server (wrong host).
 */
const raw = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "").trim() ?? "";
export const API_BASE_URL =
  raw.length > 0 ? raw : "http://localhost:8000";
