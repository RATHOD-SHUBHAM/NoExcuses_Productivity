import { useEffect, useState } from "react";
import {
  getAuthTraceBuffer,
  isAuthDebugHudEnabled,
  subscribeAuthTrace,
} from "../lib/authTrace";

export function AuthTraceHud() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthDebugHudEnabled()) {
      return;
    }
    setOpen(true);
    setLines([...getAuthTraceBuffer()]);
    return subscribeAuthTrace(() => {
      setLines([...getAuthTraceBuffer()]);
    });
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed bottom-2 left-2 right-2 z-[100] max-h-[40vh] overflow-auto rounded-lg border border-amber-500/40 bg-black/90 p-2 font-mono text-[10px] text-amber-100 shadow-xl sm:left-auto sm:right-2 sm:max-w-md sm:text-xs">
      <div className="mb-1 flex items-center justify-between gap-2 border-b border-amber-500/20 pb-1 text-amber-200/90">
        <span>Auth trace (?authDebug=1)</span>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          onClick={() => {
            try {
              window.localStorage.removeItem("noexcusesAuthDebug");
            } catch {
              /* */
            }
            setOpen(false);
          }}
        >
          Close
        </button>
      </div>
      <ul className="space-y-0.5 break-all">
        {lines.length === 0 ? (
          <li className="text-zinc-500">No events yet…</li>
        ) : (
          lines.map((l, i) => (
            <li key={`${i}-${l.slice(0, 24)}`}>{l}</li>
          ))
        )}
      </ul>
    </div>
  );
}
