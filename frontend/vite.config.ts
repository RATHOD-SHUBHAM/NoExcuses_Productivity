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
  const viteEnv = { ...rootVite, ...feVite };

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
