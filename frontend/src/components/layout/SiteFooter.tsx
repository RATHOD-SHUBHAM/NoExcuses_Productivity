export function SiteFooter() {
  const year = new Date().getFullYear();
  const deploySha = (import.meta.env.VITE_DEPLOY_SHA ?? "").trim();

  return (
    <footer
      className="relative z-0 mt-auto border-t border-white/[0.06] px-4 py-8 text-center sm:py-10"
      role="contentinfo"
    >
      <p className="text-xs text-zinc-500 sm:text-sm">
        Built by{" "}
        <span className="font-medium text-zinc-400">Shubham Shankar</span>
      </p>
      <p className="mt-1.5 text-[11px] text-zinc-600 sm:text-xs">
        © {year} Shubham Shankar. All rights reserved.
      </p>
      {import.meta.env.PROD && deploySha.length > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-zinc-700">
          build {deploySha.slice(0, 7)}
        </p>
      ) : null}
    </footer>
  );
}
