import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseEnvConfigured,
} from "./publicEnv";

let client: SupabaseClient | null = null;
/** Recreate client if deploy/env changes (singleton would otherwise keep wrong project). */
let clientFingerprint = "";

export function isSupabaseConfigured(): boolean {
  return isSupabaseEnvConfigured();
}

/** Returns null until both URL and anon key are set in env (avoids crashing on import). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnvConfigured()) {
    client = null;
    clientFingerprint = "";
    return null;
  }
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const fingerprint = `${url}::${anon}`;
  if (client && clientFingerprint !== fingerprint) {
    client = null;
  }
  clientFingerprint = fingerprint;
  if (!client) {
    try {
      client = createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch {
      console.error(
        "[NoExcuses] Supabase createClient failed — check URL/key (runtime bootstrap or VITE_*).",
      );
      client = null;
      clientFingerprint = "";
      return null;
    }
  }
  return client;
}
