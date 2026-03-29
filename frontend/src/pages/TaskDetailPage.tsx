import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ContributionGrid } from "../components/heatmaps/ContributionGrid";
import { WeeklyHeatmapStrip } from "../components/heatmaps/WeeklyHeatmapStrip";
import * as tasksApi from "../api/tasksApi";
import type { ApiTaskLog, ApiTaskStats } from "../api/types";
import {
  formatMonthYearFromBucket,
  inclusiveLocalRange,
  localDateKeyFromIso,
  todayLocalISO,
} from "../lib/date";
import { SectionHeading } from "../components/ui/SectionHeading";
import { PlannedTimeInputs } from "../components/ui/PlannedTimeInputs";
import {
  alertError,
  glassCard,
  glassCardSubtle,
  pageContainer,
} from "../lib/ui";
import { heatmapAccentForTask } from "../lib/heatmapAccent";
import {
  contributionWeekColumns,
  lastNDaysInclusive,
  startOfLocalDay,
} from "../lib/heatmapDates";

function sortLogsAsc(rows: ApiTaskLog[]): ApiTaskLog[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeLog(prev: ApiTaskLog[], next: ApiTaskLog): ApiTaskLog[] {
  const key = next.date.slice(0, 10);
  const idx = prev.findIndex((l) => l.date.slice(0, 10) === key);
  const copy = [...prev];
  if (idx >= 0) copy[idx] = next;
  else copy.push(next);
  return sortLogsAsc(copy);
}

function parseTaskCreatedAt(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? startOfLocalDay(new Date()) : d;
}

export function TaskDetailPage() {
  const { task_id } = useParams<{ task_id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [taskKind, setTaskKind] = useState<"daily" | "monthly">("daily");
  const [monthBucket, setMonthBucket] = useState<string | null>(null);
  const [logs, setLogs] = useState<ApiTaskLog[]>([]);
  const [stats, setStats] = useState<ApiTaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  /** Whole-day rest from the calendar / API — drives heatmap. */
  const [globalRestKeys, setGlobalRestKeys] = useState<Set<string>>(
    () => new Set(),
  );
  /** Per-task rest (home row or this page) — heatmap + “this habit” checkbox. */
  const [perTaskRestKeys, setPerTaskRestKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [windowStartEdit, setWindowStartEdit] = useState("");
  const [windowEndEdit, setWindowEndEdit] = useState("");
  const [windowSaving, setWindowSaving] = useState(false);

  const load = useCallback(async () => {
    if (!task_id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    setNotFound(false);

    try {
      const list = await tasksApi.getAllTasks();
      const task = list.find((t) => t.id === task_id);
      if (!task) {
        setNotFound(true);
        setTitle(null);
        setCreatedAt(null);
        setTaskKind("daily");
        setMonthBucket(null);
        setLogs([]);
        setStats(null);
        setGlobalRestKeys(new Set());
        setPerTaskRestKeys(new Set());
        return;
      }
      setTitle(task.title);
      setCreatedAt(task.created_at);
      setTaskKind(task.task_kind === "monthly" ? "monthly" : "daily");
      setMonthBucket(
        task.month_bucket != null && String(task.month_bucket).length > 0
          ? String(task.month_bucket).slice(0, 10)
          : null,
      );
      setWindowStartEdit(
        task.window_start != null && String(task.window_start).trim()
          ? String(task.window_start).trim().slice(0, 5)
          : "",
      );
      setWindowEndEdit(
        task.window_end != null && String(task.window_end).trim()
          ? String(task.window_end).trim().slice(0, 5)
          : "",
      );

      const todayStr = todayLocalISO();
      const createdLocal = localDateKeyFromIso(task.created_at);
      const { from, to } = inclusiveLocalRange(createdLocal, todayStr);
      const [logRows, statRow] = await Promise.all([
        tasksApi.getTaskLogs(task_id),
        tasksApi.getTaskStats(task_id, todayStr),
      ]);
      setLogs(sortLogsAsc(logRows));
      setStats(statRow);

      const [globalR, taskR] = await Promise.all([
        tasksApi.listRestDays(from, to).catch(() => []),
        tasksApi.listTaskRestDaysForTask(task_id, from, to).catch(
          () => [] as { date: string }[],
        ),
      ]);
      const g = new Set<string>();
      for (const r of globalR) g.add(r.date.slice(0, 10));
      setGlobalRestKeys(g);
      const p = new Set<string>();
      for (const r of taskR) p.add(r.date.slice(0, 10));
      setPerTaskRestKeys(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [task_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayLocalISO();
  const completedToday = useMemo(
    () =>
      logs.some(
        (l) => l.date.slice(0, 10) === today && l.completed === true,
      ),
    [logs, today],
  );

  const weeklyDays = useMemo(() => lastNDaysInclusive(7), [today]);

  const fullHistoryColumns = useMemo(() => {
    if (!createdAt) return [];
    const start = startOfLocalDay(parseTaskCreatedAt(createdAt));
    const end = startOfLocalDay(new Date());
    if (start > end) return [];
    return contributionWeekColumns(start, end);
  }, [createdAt]);

  const logCompletedByDate = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const l of logs) {
      m.set(l.date.slice(0, 10), l.completed);
    }
    return m;
  }, [logs]);

  const accent = useMemo(
    () =>
      task_id
        ? heatmapAccentForTask(task_id)
        : { done: "#10b981", dim: "#27272a", rest: "#d97706" },
    [task_id],
  );

  const restByDate = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const k of globalRestKeys) m.set(k, true);
    for (const k of perTaskRestKeys) m.set(k, true);
    return m;
  }, [globalRestKeys, perTaskRestKeys]);

  /** Checkbox: only per-task rest (whole-day rest still colors the heatmap). */
  const perHabitRestToday = perTaskRestKeys.has(today);

  const completedDatesDesc = useMemo(() => {
    return logs
      .filter((l) => l.completed)
      .map((l) => l.date.slice(0, 10))
      .sort((a, b) => b.localeCompare(a));
  }, [logs]);

  async function handleToggleRestToday() {
    if (!task_id || loading || actionLoading) return;
    const next = !perTaskRestKeys.has(today);
    const prevKeys = new Set(perTaskRestKeys);
    const prevStats = stats;
    setActionLoading(true);
    setError(null);
    setPerTaskRestKeys((prev) => {
      const n = new Set(prev);
      if (next) n.add(today);
      else n.delete(today);
      return n;
    });
    try {
      if (next) {
        await tasksApi.addTaskRestDay(task_id, today);
      } else {
        await tasksApi.deleteTaskRestDay(task_id, today);
      }
      const s = await tasksApi.getTaskStats(task_id, today);
      setStats(s);
    } catch (e) {
      setPerTaskRestKeys(prevKeys);
      setStats(prevStats);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleToday() {
    if (!task_id || loading || actionLoading) return;
    const next = !completedToday;
    const prevLogs = logs;
    const prevStats = stats;
    setActionLoading(true);
    setError(null);
    setLogs((p) => mergeLog(p, { date: today, completed: next }));
    try {
      const log = await tasksApi.markTaskComplete(task_id, {
        date: today,
        ...(next ? {} : { completed: false }),
      });
      setLogs((p) => mergeLog(p, log));
      const s = await tasksApi.getTaskStats(task_id, today);
      setStats(s);
    } catch (e) {
      setLogs(prevLogs);
      setStats(prevStats);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!task_id || loading || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      await tasksApi.deleteTask(task_id);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  const busy = loading || actionLoading;

  async function handleSaveWindow() {
    if (!task_id || taskKind !== "daily") return;
    const ws = windowStartEdit.trim();
    const we = windowEndEdit.trim();
    if ((ws && !we) || (!ws && we)) {
      setError("Set both start and end time, or clear both fields.");
      return;
    }
    if (ws && we && ws >= we) {
      setError("End time must be after start.");
      return;
    }
    setError(null);
    setWindowSaving(true);
    try {
      await tasksApi.patchTask(task_id, {
        window_start: ws && we ? ws : null,
        window_end: ws && we ? we : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save window");
    } finally {
      setWindowSaving(false);
    }
  }

  return (
    <div
      className={`${pageContainer} flex min-h-dvh flex-col gap-8 sm:gap-10 lg:gap-12`}
    >
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-rose-200/95 shadow-md shadow-black/20 backdrop-blur-sm transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-white active:scale-[0.98]"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Back to home
      </Link>

      {loading && (
        <div
          className="flex items-center gap-3 text-sm text-zinc-400"
          aria-busy="true"
          aria-live="polite"
        >
          <span
            className="inline-block size-5 animate-spin rounded-full border-2 border-zinc-600 border-t-red-400"
            aria-hidden
          />
          Loading task…
        </div>
      )}

      {error && !loading && (
        <div role="alert" className={alertError}>
          <p className="font-medium text-red-100">Something went wrong</p>
          <p className="mt-1 text-xs text-red-200/80">{error}</p>
        </div>
      )}

      {!loading && notFound && !error && (
        <p className="text-red-300/90">Task not found.</p>
      )}

      {!loading && !notFound && title && (
        <>
          <header className="space-y-4">
            <h1 className="text-balance bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              {title}
            </h1>
            {taskKind === "monthly" && monthBucket ? (
              <p className="text-sm text-rose-200/85">
                Monthly goal · {formatMonthYearFromBucket(monthBucket)}
              </p>
            ) : null}
            {taskKind === "daily" ? (
              <div
                className={`${glassCardSubtle} flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end`}
              >
                <div>
                  <p className="mb-2 text-sm text-zinc-400">
                    Planned window (optional)
                  </p>
                  <PlannedTimeInputs
                    startId="task-window-start"
                    endId="task-window-end"
                    startValue={windowStartEdit}
                    endValue={windowEndEdit}
                    onStartChange={setWindowStartEdit}
                    onEndChange={setWindowEndEdit}
                    disabled={busy || windowSaving}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveWindow()}
                  disabled={busy || windowSaving}
                  className="min-h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-100 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {windowSaving ? "Saving…" : "Save window"}
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 px-4 py-3 shadow-inner shadow-black/20 backdrop-blur-md has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 sm:min-h-0 sm:py-2.5">
                <input
                  type="checkbox"
                  checked={completedToday}
                  disabled={busy}
                  onChange={() => void handleToggleToday()}
                  className="size-5 shrink-0 rounded border-zinc-500 bg-zinc-950 text-emerald-500 focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0 sm:size-4"
                  aria-label={`${completedToday ? "Uncheck" : "Mark"} completed for today`}
                />
                <span className="text-sm font-medium text-zinc-100">
                  Completed today
                </span>
              </label>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-950/25 px-4 py-3 shadow-inner shadow-black/20 backdrop-blur-md has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 sm:min-h-0 sm:py-2.5">
                <input
                  type="checkbox"
                  checked={perHabitRestToday}
                  disabled={busy}
                  onChange={() => void handleToggleRestToday()}
                  className="size-5 shrink-0 rounded border-amber-600/50 bg-zinc-950 text-amber-500 focus:ring-2 focus:ring-amber-500/35 focus:ring-offset-0 sm:size-4"
                  aria-label={`${perHabitRestToday ? "Remove" : "Mark"} rest day for this habit only`}
                />
                <span className="text-sm font-medium text-amber-100/95">
                  Rest today
                </span>
              </label>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                className="min-h-11 rounded-xl border border-red-500/35 bg-red-950/45 px-5 py-3 text-sm font-semibold text-red-200 shadow-lg shadow-red-950/30 backdrop-blur-sm transition hover:border-red-400/50 hover:bg-red-950/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-2.5"
              >
                Delete task
              </button>
            </div>
            {globalRestKeys.has(today) ? (
              <p className="text-xs leading-relaxed text-violet-300/90">
                Whole-day rest is on for today (set on home). The heatmaps show it.
                The checkbox only adds or removes rest for{" "}
                <span className="font-medium text-violet-200">this habit</span>.
              </p>
            ) : null}
          </header>

          {stats && (
            <section
              aria-labelledby="stats-heading"
              className={glassCard}
            >
              <SectionHeading id="stats-heading">
                Productivity & rest
              </SectionHeading>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Total completed days</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                    {stats.total_completed_days}
                  </dd>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Rest days</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-amber-200">
                    {stats.rest_days_count ?? 0}
                  </dd>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                    Global and/or this habit only (in your tracked window).
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-950/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Current streak</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">
                    {stats.current_streak} days
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Longest streak</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                    {stats.longest_streak} days
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Completion</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                    {stats.completion_percent}%
                  </dd>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Done ÷ days tracked
                  </p>
                </div>
                <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">On track</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-violet-200">
                    {stats.accounted_percent ?? 0}%
                  </dd>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                    {(stats.accounted_days ?? 0).toLocaleString()} of{" "}
                    {stats.total_days_tracked.toLocaleString()} days completed
                    or rest
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">
                    Days tracked (window)
                  </dt>
                  <dd className="mt-1 text-zinc-200">
                    {stats.total_days_tracked}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section
            aria-labelledby="heatmap-weekly-heading"
            className="space-y-3"
          >
            <SectionHeading id="heatmap-weekly-heading">
              Last 7 days
            </SectionHeading>
            <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: accent.done }}
                  aria-hidden
                />
                Done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: accent.rest }}
                  aria-hidden
                />
                Rest
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm bg-zinc-700"
                  aria-hidden
                />
                Off
              </span>
            </p>
            <WeeklyHeatmapStrip
              days={weeklyDays}
              logCompletedByDate={logCompletedByDate}
              restByDate={restByDate}
              todayKey={today}
              accent={accent}
            />
          </section>

          <section
            aria-labelledby="heatmap-history-heading"
            className="space-y-3"
          >
            <SectionHeading id="heatmap-history-heading">
              Full history
            </SectionHeading>
            <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: accent.done }}
                  aria-hidden
                />
                Done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: accent.rest }}
                  aria-hidden
                />
                Rest
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm bg-zinc-700"
                  aria-hidden
                />
                Off
              </span>
            </p>
            <div className={`${glassCard} px-3 py-4 sm:px-4`}>
              <ContributionGrid
                weeks={fullHistoryColumns}
                logCompletedByDate={logCompletedByDate}
                restByDate={restByDate}
                accent={accent}
              />
            </div>
          </section>

          {completedDatesDesc.length > 0 && (
            <section aria-labelledby="completed-dates-heading">
              <SectionHeading id="completed-dates-heading">
                Completed dates
              </SectionHeading>
              <ul className="flex flex-wrap gap-2">
                {completedDatesDesc.map((d) => (
                  <li
                    key={d}
                    className="rounded-lg border border-emerald-500/25 bg-emerald-950/35 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-sm shadow-emerald-950/40"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="logs-heading">
            <SectionHeading id="logs-heading">Full log</SectionHeading>
            <p className="mb-2 text-xs text-zinc-500">
              {logs.length} row{logs.length === 1 ? "" : "s"} (sorted by date,
              oldest first)
            </p>
            {logs.length === 0 ? (
              <p className="text-sm text-zinc-500">No logs yet.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm backdrop-blur-sm">
                {logs.map((log, i) => (
                  <li
                    key={`${log.date}-${i}`}
                    className="flex justify-between gap-4 text-zinc-300"
                  >
                    <span>{log.date.slice(0, 10)}</span>
                    <span
                      className={
                        log.completed ? "text-emerald-400" : "text-zinc-600"
                      }
                    >
                      {log.completed ? "Done" : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
