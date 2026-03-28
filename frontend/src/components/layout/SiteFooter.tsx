export function SiteFooter() {
  const year = new Date().getFullYear();

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
    </footer>
  );
}
