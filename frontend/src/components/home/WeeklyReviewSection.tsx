import { useCallback, useEffect, useState } from "react";
import * as tasksApi from "../../api/tasksApi";
import { glassCard, inputBase } from "../../lib/ui";
import { formatWeekLabel, mondayLocalISO } from "../../lib/week";
import { SectionHeading } from "../ui/SectionHeading";

export function WeeklyReviewSection() {
  const weekStart = mondayLocalISO();
  const [worked, setWorked] = useState("");
  const [improve, setImprove] = useState("");
  const [drop, setDrop] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await tasksApi.getWeeklyReview(weekStart);
      setWorked(r.what_worked);
      setImprove(r.what_to_improve);
      setDrop(r.what_to_drop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      await tasksApi.putWeeklyReview({
        week_start: weekStart,
        what_worked: worked,
        what_to_improve: improve,
        what_to_drop: drop,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="weekly-review-heading">
      <SectionHeading id="weekly-review-heading">Weekly review</SectionHeading>
      <p className="mb-4 -mt-1 text-xs text-zinc-500">
        Week of {formatWeekLabel(weekStart)}
      </p>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-xs text-red-100 backdrop-blur-sm"
        >
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className={`${glassCard} flex flex-col gap-4`}>
          <label className="block text-xs font-medium text-zinc-400">
            What worked?
            <textarea
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
              rows={3}
              className={`mt-1.5 w-full resize-y px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 ${inputBase}`}
              placeholder="Habits, routines, or mindsets that helped."
            />
          </label>
          <label className="block text-xs font-medium text-zinc-400">
            What to improve next week?
            <textarea
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              rows={3}
              className={`mt-1.5 w-full resize-y px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 ${inputBase}`}
              placeholder="One or two concrete adjustments."
            />
          </label>
          <label className="block text-xs font-medium text-zinc-400">
            What to drop or say no to?
            <textarea
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
              rows={2}
              className={`mt-1.5 w-full resize-y px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 ${inputBase}`}
              placeholder="Commitments, distractions, or guilt you’re releasing."
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="min-h-11 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/40 transition hover:from-rose-500 hover:to-rose-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save review"}
            </button>
            {savedFlash && (
              <span className="text-xs text-emerald-400">Saved.</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
