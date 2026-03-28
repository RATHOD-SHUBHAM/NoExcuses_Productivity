import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..");
  const frontendRoot = __dirname;
  // Merge repo root + frontend/.env so both Option A (frontend/.env) and root .env work.
  const rootVite = loadEnv(mode, repoRoot, "VITE_");
  const feVite = loadEnv(mode, frontendRoot, "VITE_");
  const viteEnv: Record<string, string> = { ...rootVite, ...feVite };
  // Vercel/CI set secrets on process.env; force them to win over any merged .env files.
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_") && process.env[key] !== undefined) {
      viteEnv[key] = process.env[key] as string;
    }
  }

  return {
    envDir: frontendRoot,
    define: Object.fromEntries(
      Object.entries(viteEnv).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    plugins: [react(), tailwindcss()],
    server: {
    proxy: {
      // Zen Quotes may omit browser CORS; proxy in dev so fetch is same-origin.
      "/zen-api": {
        target: "https://zenquotes.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zen-api/, ""),
      },
    },
  },
  };
});
