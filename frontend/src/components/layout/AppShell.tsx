import type { ReactNode } from "react";
import { PageBackdrop } from "./PageBackdrop";
import { SiteFooter } from "./SiteFooter";

type AppShellProps = {
  children: ReactNode;
  userEmail?: string | null;
  onSignOut?: () => void;
};

export function AppShell({ children, userEmail, onSignOut }: AppShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden font-sans text-zinc-100 antialiased selection:bg-rose-500/30 selection:text-white">
      <PageBackdrop />
      <header className="relative z-20 flex min-h-12 shrink-0 items-center justify-end gap-3 border-b border-white/10 bg-[#050506]/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <span className="max-w-[min(100%,14rem)] truncate text-xs text-zinc-400 sm:text-sm">
          {userEmail ?? "Signed in"}
        </span>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/60"
          >
            Log out
          </button>
        ) : null}
      </header>
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
