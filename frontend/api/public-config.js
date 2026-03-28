/**
 * Vercel Serverless Function — reads env at request time (not Vite build time).
 * Uses Node http.ServerResponse only (no Express .status().json() — those are undefined here).
 */
module.exports = function publicConfigHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const supabase_url = (process.env.VITE_SUPABASE_URL ?? "").trim();
    const supabase_anon_key = (process.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
    const api_base_url = (process.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "").trim();

    const body = JSON.stringify({
      supabase_url,
      supabase_anon_key,
      api_base_url,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: msg }));
  }
};
