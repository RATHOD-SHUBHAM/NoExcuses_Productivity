/**
 * Overrides when the static bundle has empty `VITE_*` (e.g. Vercel build did not inline env).
 *
 * Load order (production):
 * 1. Same-origin `/noexcuses-bootstrap.json` → Render API origin (committed static file; edit if your Render URL changes).
 * 2. `GET {renderApiOrigin}/api/public/browser-config` on Render (CORS) → supabase_url + anon key; API base = that origin.
 * 3. Optional: same-origin `/api/public-config` if you use Vercel serverless and it returns JSON.
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

async function tryLoadFromRender(): Promise<boolean> {
  let origin = "";
  try {
    const b = await fetch("/noexcuses-bootstrap.json", { cache: "no-store" });
    if (!b.ok) {
      return false;
    }
    const raw = (await b.json()) as Record<string, unknown>;
    origin = String(raw.renderApiOrigin ?? "").replace(/\/$/, "").trim();
  } catch {
    return false;
  }
  if (!origin) {
    return false;
  }

  try {
    const r = await fetch(`${origin}/api/public/browser-config`, {
      cache: "no-store",
    });
    if (!r.ok) {
      return false;
    }
    const ct = (r.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return false;
    }
    const j = (await r.json()) as Record<string, unknown>;
    applyRuntimePublicConfigFromServer({
      supabase_url: String(j.supabase_url ?? ""),
      supabase_anon_key: String(j.supabase_anon_key ?? ""),
      api_base_url: origin,
    });
    return Boolean(runtimeSupabaseUrl && runtimeSupabaseAnonKey && runtimeApiBaseUrl);
  } catch {
    return false;
  }
}

async function tryLoadFromVercelServerless(): Promise<boolean> {
  try {
    const r = await fetch("/api/public-config", { cache: "no-store" });
    if (!r.ok) {
      return false;
    }
    const ct = (r.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return false;
    }
    const j = (await r.json()) as Record<string, unknown>;
    applyRuntimePublicConfigFromServer({
      supabase_url: String(j.supabase_url ?? ""),
      supabase_anon_key: String(j.supabase_anon_key ?? ""),
      api_base_url: String(j.api_base_url ?? ""),
    });
    return Boolean(runtimeSupabaseUrl && runtimeSupabaseAnonKey);
  } catch {
    return false;
  }
}

/**
 * Production: fill missing baked `VITE_*` via Render bootstrap (reliable) then optional Vercel function.
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

  if (await tryLoadFromRender()) {
    return;
  }
  await tryLoadFromVercelServerless();
}
