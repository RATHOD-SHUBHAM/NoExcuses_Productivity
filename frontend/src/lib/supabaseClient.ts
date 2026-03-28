import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
/** Recreate client if deploy/env changes (singleton would otherwise keep wrong project). */
let clientFingerprint = "";

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  return url.length > 0 && anon.length > 0;
}

/** Returns null until both URL and anon key are set in env (avoids crashing on import). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    client = null;
    clientFingerprint = "";
    return null;
  }
  const url = import.meta.env.VITE_SUPABASE_URL!.trim();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  const fingerprint = `${url}::${anon}`;
  if (client && clientFingerprint !== fingerprint) {
    client = null;
  }
  clientFingerprint = fingerprint;
  if (!client) {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
