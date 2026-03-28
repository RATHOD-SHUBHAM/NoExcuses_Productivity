import { resolvedApiBaseUrl } from "../lib/publicEnv";

/** FastAPI base URL (no trailing slash). */
export const API_BASE_URL = resolvedApiBaseUrl();

export function assertApiBaseConfigured(): void {
  if (!API_BASE_URL) {
    throw new Error(
      import.meta.env.PROD
        ? "Missing VITE_API_BASE_URL at build time — add it under Vercel → Environment Variables, then redeploy."
        : "Missing VITE_API_BASE_URL — add it to frontend/.env or the repo root .env.",
    );
  }
}
