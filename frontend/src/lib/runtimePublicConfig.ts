/**
 * Overrides when the static bundle has empty `VITE_*` (e.g. Vercel build did not inline env).
 * Filled from same-origin `GET /api/public-config` (Vercel serverless reads `process.env` at runtime).
 */
let runtimeSupabaseUrl = "";
let runtimeSupabaseAnonKey = "";
let runtimeApiBaseUrl = "";

export function getRuntimeOverrideSupabaseUrl(): string {
  return runtimeSupabaseUrl;
}

export function getRuntimeOverrideSupabaseAnonKey(): string {
  return runtimeSupabaseAnonKey;
}

export function getRuntimeOverrideApiBaseUrl(): string {
  return runtimeApiBaseUrl;
}

export function applyRuntimePublicConfigFromServer(json: {
  supabase_url?: string;
  supabase_anon_key?: string;
  api_base_url?: string;
}): void {
  const u = String(json.supabase_url ?? "").trim();
  const k = String(json.supabase_anon_key ?? "").trim();
  const a = String(json.api_base_url ?? "").replace(/\/$/, "").trim();
  if (u) runtimeSupabaseUrl = u;
  if (k) runtimeSupabaseAnonKey = k;
  if (a) runtimeApiBaseUrl = a;
}

/**
 * Production: if Vite did not bake Supabase URL + key, fetch from `/api/public-config`.
 * Skips when the bundle already has both (local build or working CI).
 */
export async function loadRuntimePublicConfigOnce(): Promise<void> {
  if (!import.meta.env.PROD) {
    return;
  }
  const bakedUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const bakedKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  const bakedApi = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "").trim();
  if (bakedUrl && bakedKey && bakedApi) {
    return;
  }

  try {
    const r = await fetch("/api/public-config", { cache: "no-store" });
    if (!r.ok) {
      return;
    }
    const j = (await r.json()) as Record<string, unknown>;
    applyRuntimePublicConfigFromServer({
      supabase_url: String(j.supabase_url ?? ""),
      supabase_anon_key: String(j.supabase_anon_key ?? ""),
      api_base_url: String(j.api_base_url ?? ""),
    });
  } catch {
    /* offline or no serverless route (e.g. vite preview) */
  }
}
