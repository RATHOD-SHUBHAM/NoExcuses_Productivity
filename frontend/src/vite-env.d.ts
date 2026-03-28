/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Set on Vercel from VERCEL_GIT_COMMIT_SHA at build time (empty locally). */
  readonly VITE_DEPLOY_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
