import { useCallback, useEffect, useState } from "react";
import * as tasksApi from "../../api/tasksApi";
import { todayLocalISO } from "../../lib/date";
import { glassCard } from "../../lib/ui";
import { SectionHeading } from "../ui/SectionHeading";

function shiftISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + deltaDays);
  const yy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type RestProps = {
  /** After whole-day rest is toggled successfully, refresh charts that depend on it. */
  onRestDayChanged?: () => void;
};

export function RestDayExportSection({ onRestDayChanged }: RestProps) {
  const today = todayLocalISO();
  const [isRestToday, setIsRestToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<"json" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshRest = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const from = shiftISO(today, -60);
      const to = shiftISO(today, 30);
      const rows = await tasksApi.listRestDays(from, to);
      const set = new Set(rows.map((r) => r.date.slice(0, 10)));
      setIsRestToday(set.has(today));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rest days");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void refreshRest();
  }, [refreshRest]);

  async function toggleRest(checked: boolean) {
    setBusy(true);
    setError(null);
    const prev = isRestToday;
    setIsRestToday(checked);
    try {
      if (checked) {
        await tasksApi.addRestDay(today);
      } else {
        await tasksApi.deleteRestDay(today);
      }
      onRestDayChanged?.();
    } catch (e) {
      setIsRestToday(prev);
      setError(e instanceof Error ? e.message : "Could not update rest day");
    } finally {
      setBusy(false);
    }
  }

  async function onExportJson() {
    setExportBusy("json");
    setError(null);
    try {
      await tasksApi.downloadExportJson();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(null);
    }
  }

  async function onExportCsv() {
    setExportBusy("csv");
    setError(null);
    try {
      await tasksApi.downloadExportCsv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(null);
    }
  }

  return (
    <section aria-labelledby="rest-export-heading">
      <SectionHeading id="rest-export-heading">Rest & data</SectionHeading>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-xs text-red-100 backdrop-blur-sm"
        >
          {error}
        </div>
      )}
      <div className={`${glassCard} flex flex-col gap-4`}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:border-amber-500/20 sm:p-4">
          <input
            type="checkbox"
            checked={isRestToday}
            disabled={loading || busy}
            onChange={(e) => void toggleRest(e.target.checked)}
            className="mt-1 size-5 shrink-0 rounded border-zinc-500 bg-zinc-950 text-amber-500 focus:ring-2 focus:ring-amber-500/35 focus:ring-offset-0 sm:mt-0.5 sm:size-4"
          />
          <span className="text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">
              Today is a rest day for all habits
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Applies to every task. For a single habit only, use{" "}
              <span className="text-zinc-400">Rest today</span> on
              the task row. Streaks can bridge across rest days so gaps don’t
              always break the chain.
            </span>
          </span>
        </label>
        <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-3 text-xs font-medium text-zinc-400 sm:text-sm">
            Export your data
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onExportJson()}
              disabled={exportBusy !== null}
              className="min-h-11 rounded-xl border border-white/12 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-100 shadow-md transition hover:border-violet-400/40 hover:bg-violet-950/40 disabled:opacity-50 sm:min-h-0"
            >
              {exportBusy === "json" ? "…" : "Download JSON"}
            </button>
            <button
              type="button"
              onClick={() => void onExportCsv()}
              disabled={exportBusy !== null}
              className="min-h-11 rounded-xl border border-white/12 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-100 shadow-md transition hover:border-violet-400/40 hover:bg-violet-950/40 disabled:opacity-50 sm:min-h-0"
            >
              {exportBusy === "csv" ? "…" : "Download CSV"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
