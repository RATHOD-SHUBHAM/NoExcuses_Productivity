import { useCallback, useEffect, useState } from "react";
import * as tasksApi from "../../api/tasksApi";
import { todayLocalISO } from "../../lib/date";

type Props = {
  /** After toggling rest (calendar heatmap / graphs should refresh). */
  onChanged?: () => void | Promise<void>;
  disabled?: boolean;
};

/** Whole-day rest for today — lives on Home so the calendar panel stays navigation-only. */
export function GlobalRestTodayControl({ onChanged, disabled }: Props) {
  const today = todayLocalISO();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const day = await tasksApi.getCalendarDay(today);
      setOn(day.global_rest === true);
    } catch {
      setOn(false);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle() {
    if (busy || disabled) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    try {
      if (next) {
        await tasksApi.addRestDay(today);
      } else {
        await tasksApi.deleteRestDay(today);
      }
      await onChanged?.();
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 transition hover:border-violet-500/35 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      <input
        type="checkbox"
        checked={on}
        disabled={loading || busy || disabled}
        onChange={() => void toggle()}
        className="size-4 shrink-0 rounded border-zinc-500 bg-zinc-950 text-violet-400 focus:ring-2 focus:ring-violet-500/30"
      />
      <span className="text-sm leading-snug text-violet-100/95">
        <span className="font-medium text-white">Whole day rest</span>
        <span className="block text-xs font-normal text-zinc-500">
          {loading ? "Loading…" : "Applies to all habits for today."}
        </span>
      </span>
    </label>
  );
}
