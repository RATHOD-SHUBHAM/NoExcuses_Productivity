/**
 * Browser-visible configuration (VITE_* only).
 *
 * Flow:
 * 1. Local: `frontend/.env` and/or repo root `.env` — merged in `vite.config.ts` → baked into the bundle.
 * 2. Vercel: Project → Environment Variables (Production + Preview if you use preview URLs) → available as
 *    `process.env` during `vite build` → same merge in vite.config → baked in. Changing env requires a new deploy.
 * 3. Nothing in this file reads runtime server env; it is all compile-time replacements of `import.meta.env`.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
const apiBaseRaw = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "").trim();

export function getSupabaseUrl(): string {
  return supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

/**
 * FastAPI origin, no trailing slash.
 * In dev, empty VITE_API_BASE_URL falls back to local backend.
 * In production, missing env must stay empty so we do not silently call localhost:8000 from the user’s browser.
 */
export function resolvedApiBaseUrl(): string {
  if (apiBaseRaw.length > 0) {
    return apiBaseRaw;
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8000";
  }
  return "";
}

export function isSupabaseEnvConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

/** One-time console signal when the production bundle is missing required VITE_* values. */
export function logDeployEnvDiagnostics(): void {
  if (!import.meta.env.PROD) {
    return;
  }
  const lines: string[] = [];
  if (!supabaseUrl) {
    lines.push("VITE_SUPABASE_URL is empty — set in Vercel env, then redeploy.");
  }
  if (!supabaseAnonKey) {
    lines.push("VITE_SUPABASE_ANON_KEY is empty — set in Vercel env, then redeploy.");
  }
  if (!apiBaseRaw) {
    lines.push(
      "VITE_API_BASE_URL is empty — API calls cannot reach Render; set in Vercel env, then redeploy.",
    );
  }
  if (lines.length > 0) {
    console.error("[NoExcuses] Deploy env problems:\n- " + lines.join("\n- "));
  }
}
