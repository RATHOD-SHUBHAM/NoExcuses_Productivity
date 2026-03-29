import { DataExportFooter } from "./DataExportFooter";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const deploySha = (import.meta.env.VITE_DEPLOY_SHA ?? "").trim();
  const fingerprint = (import.meta.env.VITE_DEPLOY_FINGERPRINT ?? "").trim();

  return (
    <footer
      className="relative z-0 mt-auto border-t border-white/[0.06] px-4 py-8 text-center sm:py-10"
      role="contentinfo"
    >
      <p className="text-sm text-zinc-500">
        Built by{" "}
        <span className="font-medium text-zinc-400">Shubham Shankar</span>
      </p>
      <p className="mt-1.5 text-sm text-zinc-600">
        © {year} Shubham Shankar. All rights reserved.
      </p>
      <DataExportFooter />
      {import.meta.env.PROD && fingerprint.length > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-zinc-600" title={fingerprint}>
          deploy {fingerprint.length > 14 ? `${fingerprint.slice(0, 12)}…` : fingerprint}
        </p>
      ) : null}
      {import.meta.env.PROD && fingerprint.length === 0 && deploySha.length > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-zinc-700">
          build {deploySha.slice(0, 7)}
        </p>
      ) : null}
    </footer>
  );
}
