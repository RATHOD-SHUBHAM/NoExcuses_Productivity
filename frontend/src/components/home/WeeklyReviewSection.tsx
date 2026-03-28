import { useCallback, useEffect, useMemo, useState } from "react";
import * as tasksApi from "../../api/tasksApi";
import type { ApiWeeklyReview } from "../../api/types";
import {
  downloadWeeklyReviewTxt,
  downloadWeeklyReviewsJson,
  formatWeeklyReviewAsText,
} from "../../lib/reviewDownload";
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
  const [history, setHistory] = useState<ApiWeeklyReview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const list = await tasksApi.listWeeklyReviews(100);
      setHistory(list);
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : "Failed to load review history",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

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
    void loadHistory();
  }, [load, loadHistory]);

  const pastReviews = useMemo(
    () => history.filter((r) => r.week_start !== weekStart),
    [history, weekStart],
  );

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
      void loadHistory();
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
      <p className="mb-3 text-xs text-zinc-500 sm:text-sm">
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

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-zinc-300">
          Past reviews
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          Saved weeks are stored so you can compare progress. Download a single
          week as text or export everything as JSON.
        </p>
        {historyError && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"
          >
            {historyError}
          </div>
        )}
        {historyLoading ? (
          <p className="text-sm text-zinc-400">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No saved reviews yet. Save this week’s review to start a history.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => downloadWeeklyReviewsJson(history)}
                className="self-start rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/60"
              >
                Download all ({history.length}) as JSON
              </button>
            )}
            {pastReviews.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Only this week is saved so far — use the form above to edit it.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pastReviews.map((r) => (
                  <li key={r.week_start}>
                    <details
                      className={`${glassCard} group overflow-hidden px-3 py-2`}
                    >
                      <summary className="cursor-pointer list-none text-sm text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="font-medium">
                          {formatWeekLabel(r.week_start)}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {r.week_start}
                        </span>
                      </summary>
                      <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-xs text-zinc-300">
                          {formatWeeklyReviewAsText(r)}
                        </pre>
                        <button
                          type="button"
                          onClick={() => downloadWeeklyReviewTxt(r)}
                          className="rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/60"
                        >
                          Download this week (.txt)
                        </button>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
