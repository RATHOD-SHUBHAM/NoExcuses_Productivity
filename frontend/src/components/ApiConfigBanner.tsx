import { getProductionApiConfigIssue } from "../lib/publicEnv";

/** Shown in production when Supabase works but the FastAPI base URL was not baked in. */
export function ApiConfigBanner() {
  const msg = getProductionApiConfigIssue();
  if (!msg) {
    return null;
  }
  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-100/95 sm:text-sm"
    >
      <strong className="font-semibold text-amber-50">API URL missing in build.</strong>{" "}
      You can still use this page to sign in. {msg}
    </div>
  );
}
