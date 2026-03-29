/**
 * Browser-visible configuration: baked `VITE_*` from Vite, optional runtime overrides
 * from `/api/public-config` on Vercel (see `runtimePublicConfig.ts`).
 *
 * Local: `frontend/.env` merged in `vite.config.ts` → baked into the bundle.
 * Vercel: prefer baked values; if missing, bootstrap loads serverless config before React mounts.
 */
import {
  getRuntimeOverrideApiBaseUrl,
  getRuntimeOverrideSupabaseAnonKey,
  getRuntimeOverrideSupabaseUrl,
} from "./runtimePublicConfig";

const bakedSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const bakedSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
const bakedApiBaseRaw = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "").trim();

export function getSupabaseUrl(): string {
  const rt = getRuntimeOverrideSupabaseUrl();
  if (rt) return rt;
  return bakedSupabaseUrl;
}

export function getSupabaseAnonKey(): string {
  const rt = getRuntimeOverrideSupabaseAnonKey();
  if (rt) return rt;
  return bakedSupabaseAnonKey;
}

/**
 * FastAPI origin, no trailing slash.
 * In dev, empty VITE_API_BASE_URL falls back to local backend.
 * In production, missing env must stay empty so we do not silently call localhost:8000 from the user’s browser.
 */
export function resolvedApiBaseUrl(): string {
  const rt = getRuntimeOverrideApiBaseUrl();
  if (rt) return rt;
  if (bakedApiBaseRaw.length > 0) {
    return bakedApiBaseRaw;
  }
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:8000";
  }
  return "";
}

export function isSupabaseEnvConfigured(): boolean {
  return getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0;
}

/** Production-only: Supabase vars required for the login page and session. */
export function getProductionSupabaseConfigIssues(): string[] {
  if (!import.meta.env.PROD) {
    return [];
  }
  const lines: string[] = [];
  if (!getSupabaseUrl()) {
    lines.push(
      "VITE_SUPABASE_URL is empty — set Vercel env + redeploy, or set frontend/public/noexcuses-bootstrap.json renderApiOrigin and deploy Render with GET /api/public/browser-config.",
    );
  }
  if (!getSupabaseAnonKey()) {
    lines.push(
      "VITE_SUPABASE_ANON_KEY is empty — same as Supabase publishable key; redeploy or use Render browser-config bootstrap.",
    );
  }
  return lines;
}

/** Production-only: API URL missing — login still works; habit data API calls will fail. */
export function getProductionApiConfigIssue(): string | null {
  if (!import.meta.env.PROD || resolvedApiBaseUrl().length > 0) {
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

/** Console signal when the production bundle is missing required config. */
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
