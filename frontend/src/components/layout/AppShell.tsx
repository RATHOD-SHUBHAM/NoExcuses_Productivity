import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden font-sans text-zinc-100 antialiased selection:bg-rose-500/30 selection:text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-40 left-1/2 h-[min(480px,55vh)] w-[min(920px,160vw)] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-rose-600/30 via-rose-500/10 to-transparent blur-[100px]" />
        <div className="absolute top-[20%] -right-20 h-[min(420px,50vh)] w-[min(520px,100vw)] rounded-full bg-violet-600/[0.14] blur-[88px]" />
        <div className="absolute bottom-0 left-[-10%] h-[min(380px,45vh)] w-[min(600px,90vw)] rounded-full bg-emerald-900/15 blur-[80px]" />
        <div className="absolute inset-0 bg-[#050506]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(244,63,94,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(9,9,11,0.4)_45%,#030304_100%)]" />
      </div>
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
