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

/** Production-only: Supabase vars required for the login page and session. */
export function getProductionSupabaseConfigIssues(): string[] {
  if (!import.meta.env.PROD) {
    return [];
  }
  const lines: string[] = [];
  if (!supabaseUrl) {
    lines.push(
      "VITE_SUPABASE_URL is empty — add under Vercel → Environment Variables (Production), then Redeploy.",
    );
  }
  if (!supabaseAnonKey) {
    lines.push(
      "VITE_SUPABASE_ANON_KEY is empty — same as Supabase anon/publishable key; redeploy after saving.",
    );
  }
  return lines;
}

/** Production-only: API URL missing — login still works; habit data API calls will fail. */
export function getProductionApiConfigIssue(): string | null {
  if (!import.meta.env.PROD || apiBaseRaw.length > 0) {
    return null;
  }
  return "VITE_API_BASE_URL is empty — set your Render API URL (no trailing slash), redeploy; until then the login page works but tasks will not load.";
}

/** All production deploy issues (for console diagnostics). */
export function getProductionConfigIssues(): string[] {
  const supa = getProductionSupabaseConfigIssues();
  const api = getProductionApiConfigIssue();
  return api ? [...supa, api] : [...supa];
}

/** Console signal when the production bundle is missing required VITE_* values. */
export function logDeployEnvDiagnostics(): void {
  const lines = getProductionConfigIssues();
  if (lines.length > 0) {
    console.error("[NoExcuses] Deploy env problems:\n- " + lines.join("\n- "));
  }
}

/**
 * After login, the API verifies the JWT against Render's `SUPABASE_JWT_SECRET` / JWKS for
 * `SUPABASE_URL`. If Vercel points at a different Supabase project than Render, every call 401s.
 */
export async function logBackendSupabaseAlignment(): Promise<void> {
  if (!import.meta.env.PROD) {
    return;
  }
  const api = resolvedApiBaseUrl();
  const feUrl = getSupabaseUrl();
  if (!api || !feUrl) {
    return;
  }
  try {
    const r = await fetch(`${api}/api/public/config-check`);
    if (!r.ok) {
      return;
    }
    const j = (await r.json()) as { supabase_host?: string };
    const beHost = (j.supabase_host ?? "").toLowerCase().trim();
    let feHost = "";
    try {
      feHost = new URL(feUrl).hostname.toLowerCase();
    } catch {
      return;
    }
    if (beHost && feHost && beHost !== feHost) {
      console.error(
        `[NoExcuses] Supabase project mismatch: this site uses ${feHost} but the API is configured for ${beHost}. ` +
          `Fix Vercel (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) and Render (SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET) so they are all the same project — otherwise login works but /api/* returns 401.`,
      );
    }
  } catch {
    /* unreachable API or blocked — other errors already surface */
  }
}
