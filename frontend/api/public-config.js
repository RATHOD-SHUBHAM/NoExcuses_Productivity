/**
 * Vercel Serverless Function — reads env at request time (not Vite build time).
 * Use when `import.meta.env.VITE_*` is empty in the static bundle but project env is set.
 *
 * Supabase URL + publishable key are public by design (same as any SPA bundle).
 */
export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  const supabase_url = (process.env.VITE_SUPABASE_URL ?? "").trim();
  const supabase_anon_key = (process.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  const api_base_url = (process.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "").trim();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabase_url,
    supabase_anon_key,
    api_base_url,
  });
}
