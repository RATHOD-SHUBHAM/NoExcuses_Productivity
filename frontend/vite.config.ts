import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Env merge order (last wins for a given key):
 * 1. Repo root `.env*` (e.g. monorepo root when working locally)
 * 2. `frontend/.env*`
 * 3. `process.env` (Vercel / CI injects `VITE_*` here during `vite build`)
 *
 * We push the result into `define` so `import.meta.env.VITE_*` is replaced at build time.
 * If a variable is missing at build time, it cannot be fixed in the browser later — redeploy.
 */
export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..");
  const frontendRoot = __dirname;

  const rootVite = loadEnv(mode, repoRoot, "VITE_");
  const feVite = loadEnv(mode, frontendRoot, "VITE_");
  const viteEnv: Record<string, string> = { ...rootVite, ...feVite };

  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_") && process.env[key] !== undefined) {
      viteEnv[key] = process.env[key] as string;
    }
  }

  const define = Object.fromEntries(
    Object.entries(viteEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value ?? ""),
    ]),
  );

  if (mode === "production") {
    const required = [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "VITE_API_BASE_URL",
    ] as const;
    for (const key of required) {
      const v = (viteEnv[key] ?? "").trim();
      if (!v) {
        console.warn(
          `[vite] Production build: ${key} is missing or empty. ` +
            "The deployed app will be broken until it is set in the host env (e.g. Vercel) and you redeploy.",
        );
      }
    }
  }

  return {
    envDir: frontendRoot,
    define,
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/zen-api": {
          target: "https://zenquotes.io",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/zen-api/, ""),
        },
      },
    },
  };
});
