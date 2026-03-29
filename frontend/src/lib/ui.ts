/** Shared visual tokens — glass cards, section titles, page width */

export const pageContainer =
  "relative mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:py-10 md:max-w-3xl lg:max-w-4xl lg:px-8 lg:py-12 lg:pb-28";

/** Home dashboard — room for two columns without squeezing titles. */
export const pageContainerWide =
  "relative mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:py-10 md:max-w-3xl lg:max-w-6xl xl:max-w-7xl lg:px-8 lg:py-12 lg:pb-28";

/** Lifted panel for major home sections (calendar, rhythm). */
export const homeFeaturePanel =
  "rounded-[1.75rem] border border-white/[0.07] bg-gradient-to-b from-zinc-900/45 via-zinc-950/40 to-zinc-950/70 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.05] backdrop-blur-md";

/** Tighter inset for home panels (less vertical bulk). */
export const homePanelPad = "p-4 sm:p-5 lg:px-6 lg:py-5";

export const sectionTitle =
  "mb-3 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-400/95 sm:text-xs";

export const sectionTitleRule =
  "h-px w-5 shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-rose-500/0 sm:w-8";

export const glassCard =
  "rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl ring-1 ring-white/[0.05] sm:p-5";

export const glassCardSubtle =
  "rounded-xl border border-white/[0.06] bg-black/25 backdrop-blur-md ring-1 ring-white/[0.04]";

export const inputBase =
  "rounded-xl border border-white/10 bg-zinc-950/60 text-white placeholder:text-zinc-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25";

export const alertError =
  "rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100 shadow-lg shadow-red-950/20 backdrop-blur-sm";
