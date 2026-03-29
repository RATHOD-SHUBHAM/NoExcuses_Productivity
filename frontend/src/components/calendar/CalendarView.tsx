import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useTimeFormat } from "../../context/TimeFormatContext";
import * as tasksApi from "../../api/tasksApi";
import type { ApiCalendarDay, ApiDailyCompletion } from "../../api/types";
import {
  firstDayOfMonthForLocalISO,
  formatLocalISODate,
  todayLocalISO,
} from "../../lib/date";
import { formatTimeWindowLabel } from "../../lib/timeWindow";
import {
  alertError,
  glassCard,
  glassCardSubtle,
  inputBase,
  pageContainerWide,
} from "../../lib/ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function buildMonthCells(
  year: number,
  monthIndex0: number,
): { iso: string | null }[] {
  const first = new Date(year, monthIndex0, 1);
  const dim = new Date(year, monthIndex0 + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: { iso: string | null }[] = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ iso: null });
  }
  for (let d = 1; d <= dim; d += 1) {
    const date = new Date(year, monthIndex0, d);
    cells.push({ iso: formatLocalISODate(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null });
  }
  return cells;
}

function monthTitle(year: number, monthIndex0: number): string {
  const d = new Date(year, monthIndex0, 15);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

const HEAT: Record<number, string> = {
  0: "bg-zinc-900/30",
  1: "bg-emerald-500/35",
  2: "bg-emerald-500/47",
  3: "bg-emerald-500/59",
  4: "bg-emerald-500/71",
  5: "bg-emerald-500/83",
};

function cellHeatClass(row: ApiDailyCompletion | undefined): string {
  if (!row) return HEAT[0]!;
  if (row.global_rest) return "bg-violet-950/55 ring-1 ring-violet-500/25";
  const c = row.count ?? 0;
  if (c > 0) return HEAT[Math.min(c, 5) as keyof typeof HEAT] ?? HEAT[5]!;
  if ((row.rest_marks ?? 0) > 0) {
    return "bg-amber-950/40 ring-1 ring-amber-500/15";
  }
  return HEAT[0]!;
}

export type CalendarViewProps = {
  /** Start as a small month widget; expand to the full planner without leaving the page. */
  collapsible?: boolean;
  /** Open the full planner (e.g. nav with `?planner=open`). */
  initialExpanded?: boolean;
  /** Large hero heading (standalone `/calendar` page). */
  showHero?: boolean;
  /** Unique suffix for add-task input id when multiple instances mount. */
  formIdSuffix?: string;
  /** Hide the day-panel add form when the home page provides a single “New habit” bar. */
  hideDayAddTask?: boolean;
  /**
   * When tasks are created/removed elsewhere (e.g. Home “New habit”), this value must
   * change so we refetch day detail and today’s cell previews — otherwise the calendar
   * stays stale until full reload.
   */
  tasksRefreshKey?: string;
  /** After any completion/rest change, notify Home so graphs, check-in, and snapshot stay in sync. */
  onHabitDataChanged?: () => void | Promise<void>;
  /**
   * Home embed: hide the day task list (duplicates Check in) and optionally whole-day rest
   * (moved to Home). Standalone `/calendar` keeps both.
   */
  hideDayTaskList?: boolean;
  hideGlobalRest?: boolean;
};

export function CalendarView({
  collapsible = false,
  initialExpanded = false,
  showHero = true,
  formIdSuffix = "",
  hideDayAddTask = false,
  tasksRefreshKey = "",
  onHabitDataChanged,
  hideDayTaskList = false,
  hideGlobalRest = false,
}: CalendarViewProps) {
  const { timeFormat } = useTimeFormat();
  const today = todayLocalISO();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(now.getMonth());
  const [selectedISO, setSelectedISO] = useState(today);

  const [plannerOpen, setPlannerOpen] = useState(
    () => !collapsible || initialExpanded,
  );

  useEffect(() => {
    if (initialExpanded) {
      setPlannerOpen(true);
    }
  }, [initialExpanded]);

  const [monthRows, setMonthRows] = useState<ApiDailyCompletion[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [dayDetail, setDayDetail] = useState<ApiCalendarDay | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState<ApiDailyCompletion[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [todayDetail, setTodayDetail] = useState<ApiCalendarDay | null>(null);

  const [addKind, setAddKind] = useState<"daily" | "monthly">("daily");
  const [addTitle, setAddTitle] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const addInputId = `calendar-add-input${formIdSuffix}`;

  const monthMap = useMemo(() => {
    const m = new Map<string, ApiDailyCompletion>();
    for (const r of monthRows) {
      m.set(r.date.slice(0, 10), r);
    }
    return m;
  }, [monthRows]);

  const upcomingWindow = useMemo(() => {
    const t = new Date();
    const start = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    return {
      from: formatLocalISODate(start),
      to: formatLocalISODate(end),
    };
  }, []);

  const loadMonth = useCallback(async () => {
    setMonthError(null);
    setMonthLoading(true);
    try {
      const rows = await tasksApi.getMonthlyCompletions({
        year: viewYear,
        month: viewMonth0 + 1,
        taskKind: "all",
      });
      setMonthRows(rows);
    } catch (e) {
      setMonthError(e instanceof Error ? e.message : "Failed to load month");
      setMonthRows([]);
    } finally {
      setMonthLoading(false);
    }
  }, [viewYear, viewMonth0]);

  const loadDay = useCallback(async () => {
    setDayError(null);
    setDayLoading(true);
    try {
      const d = await tasksApi.getCalendarDay(selectedISO);
      setDayDetail(d);
    } catch (e) {
      setDayError(e instanceof Error ? e.message : "Failed to load day");
      setDayDetail(null);
    } finally {
      setDayLoading(false);
    }
  }, [selectedISO]);

  const loadUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const rows = await tasksApi.getMonthlyCompletions({
        from: upcomingWindow.from,
        to: upcomingWindow.to,
        taskKind: "all",
      });
      setUpcoming(rows);
    } catch {
      setUpcoming([]);
    } finally {
      setUpcomingLoading(false);
    }
  }, [upcomingWindow.from, upcomingWindow.to]);

  const loadToday = useCallback(async () => {
    try {
      const d = await tasksApi.getCalendarDay(today);
      setTodayDetail(d);
    } catch {
      setTodayDetail(null);
    }
  }, [today]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth, tasksRefreshKey]);

  useEffect(() => {
    void loadDay();
  }, [loadDay, tasksRefreshKey]);

  useEffect(() => {
    void loadUpcoming();
  }, [loadUpcoming, tasksRefreshKey]);

  useEffect(() => {
    void loadToday();
  }, [loadToday, tasksRefreshKey]);

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth0),
    [viewYear, viewMonth0],
  );

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth0 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth0(d.getMonth());
  }

  async function refreshAfterMutation() {
    await Promise.all([loadDay(), loadMonth(), loadUpcoming(), loadToday()]);
    await onHabitDataChanged?.();
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const title = addTitle.trim();
    if (!title || addBusy) return;
    setDayError(null);
    setAddBusy(true);
    try {
      if (addKind === "daily") {
        await tasksApi.createTask(title, { taskKind: "daily" });
      } else {
        await tasksApi.createTask(title, {
          taskKind: "monthly",
          monthBucket: firstDayOfMonthForLocalISO(selectedISO),
        });
      }
      setAddTitle("");
      await refreshAfterMutation();
    } catch (err) {
      setDayError(err instanceof Error ? err.message : "Could not add task");
    } finally {
      setAddBusy(false);
    }
  }

  async function toggleComplete(taskId: string, completed: boolean) {
    const prev = dayDetail;
    if (prev) {
      setDayDetail({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.task_id === taskId ? { ...t, completed: !completed } : t,
        ),
      });
    }
    try {
      await tasksApi.markTaskComplete(taskId, {
        date: selectedISO,
        ...(completed ? { completed: false } : {}),
      });
      await refreshAfterMutation();
    } catch (e) {
      if (prev) setDayDetail(prev);
      setDayError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function toggleTaskRest(taskId: string, restToday: boolean) {
    const prev = dayDetail;
    if (prev) {
      setDayDetail({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.task_id === taskId ? { ...t, rest_today: !restToday } : t,
        ),
      });
    }
    try {
      if (restToday) {
        await tasksApi.deleteTaskRestDay(taskId, selectedISO);
      } else {
        await tasksApi.addTaskRestDay(taskId, selectedISO);
      }
      await refreshAfterMutation();
    } catch (e) {
      if (prev) setDayDetail(prev);
      setDayError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function toggleGlobalRest() {
    const gr = dayDetail?.global_rest === true;
    const prev = dayDetail;
    if (prev) {
      setDayDetail({ ...prev, global_rest: !gr });
    }
    try {
      if (gr) {
        await tasksApi.deleteRestDay(selectedISO);
      } else {
        await tasksApi.addRestDay(selectedISO);
      }
      await refreshAfterMutation();
    } catch (e) {
      if (prev) setDayDetail(prev);
      setDayError(e instanceof Error ? e.message : "Update failed");
    }
  }

  const selectedLabel = useMemo(() => {
    const d = new Date(selectedISO + "T12:00:00");
    if (Number.isNaN(d.getTime())) return selectedISO;
    return d.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedISO]);

  const selectedShort = useMemo(() => {
    const d = new Date(selectedISO + "T12:00:00");
    if (Number.isNaN(d.getTime())) return selectedISO;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedISO]);

  const showTodayLinesInCells = !collapsible || plannerOpen;

  /** On home, the parent already applies page width — avoid double `pageContainerWide` padding. */
  const embed = collapsible;
  const outerClass = embed
    ? "flex w-full flex-col gap-6 sm:gap-8"
    : `${pageContainerWide} flex min-h-dvh flex-col gap-8 sm:gap-10`;

  /**
   * Full planner: viewport `md:` two-column layout breaks inside the home sidebar — `md` can be
   * true while the calendar column is still narrow. Embedded mode always stacks month + day panel.
   */
  const fullPlannerGridClass = embed
    ? "grid grid-cols-1 gap-8"
    : "grid gap-6 md:grid-cols-[1fr_min(26rem,100%)] md:items-start md:gap-8";
  const dayPanelStickyClass = embed
    ? ""
    : "md:sticky md:top-6";

  if (collapsible && !plannerOpen) {
    return (
      <div className={outerClass}>
        {showHero ? (
          <header className="text-center">
            <h2 className="font-display text-lg font-medium text-white sm:text-xl">
              Calendar
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Tap a day, then open full planner to tick tasks and add habits.
            </p>
          </header>
        ) : !embed ? (
          <div className="text-center">
            <h2 className="font-display text-lg font-medium text-white sm:text-xl">
              Calendar
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Tap a day, then open full planner for the complete view.
            </p>
          </div>
        ) : null}

        {(monthError || dayError) && (
          <div role="alert" className={alertError}>
            <p className="font-medium text-red-100">Something went wrong</p>
            <p className="mt-1 text-sm text-red-200/80">
              {monthError ?? dayError}
            </p>
          </div>
        )}

        <div
          className={`${glassCard} mx-auto flex w-full max-w-lg flex-col gap-3`}
          aria-busy={monthLoading}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800/60"
              aria-label="Previous month"
            >
              ←
            </button>
            <h3 className="text-center text-base font-medium text-white">
              {monthTitle(viewYear, viewMonth0)}
            </h3>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800/60"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-sm">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-0.5">
                {w.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.iso) {
                return (
                  <div
                    key={`pad-${i}`}
                    className="aspect-square min-h-[1.75rem] sm:min-h-[2rem]"
                  />
                );
              }
              const row = monthMap.get(cell.iso);
              const isSelected = cell.iso === selectedISO;
              const isTodayCell = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedISO(cell.iso!)}
                  className={[
                    "flex aspect-square min-h-[1.75rem] items-center justify-center rounded-lg border text-sm font-medium transition sm:min-h-[2rem]",
                    cellHeatClass(row),
                    isSelected
                      ? "border-rose-400/70 ring-2 ring-rose-400/40"
                      : "border-transparent",
                    isTodayCell ? "font-semibold text-white" : "text-zinc-200",
                  ].join(" ")}
                >
                  {Number(cell.iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg text-center">
          <p className="text-sm text-zinc-400">
            {dayLoading ? (
              "Loading…"
            ) : (
              <>
                <span className="text-zinc-200">{selectedShort}</span>
                {" · "}
                <span>
                  {dayDetail?.tasks.length ?? 0} task
                  {(dayDetail?.tasks.length ?? 0) === 1 ? "" : "s"}
                </span>
              </>
            )}
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-rose-500/25 bg-rose-950/20 py-2.5 text-sm font-medium text-rose-100/95 shadow-inner shadow-rose-950/30 transition hover:border-rose-400/35 hover:bg-rose-950/35"
            onClick={() => setPlannerOpen(true)}
          >
            Open full planner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={outerClass}>
      {showHero ? (
        <header className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200/95 sm:text-sm">
            Plan & review
          </p>
          <h1 className="font-display text-3xl font-normal text-white sm:text-4xl">
            Calendar
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Month view with completions, then tick and rest days for any date you
            select.
          </p>
        </header>
      ) : null}

      {(monthError || dayError) && (
        <div role="alert" className={alertError}>
          <p className="font-medium text-red-100">Something went wrong</p>
          <p className="mt-1 text-sm text-red-200/80">
            {monthError ?? dayError}
          </p>
        </div>
      )}

      <div className={fullPlannerGridClass}>
        <div className="flex flex-col gap-4">
          <div
            className={`${glassCard} flex flex-col gap-4`}
            aria-busy={monthLoading}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800/60"
                aria-label="Previous month"
              >
                ←
              </button>
              <h2 className="text-center text-lg font-medium text-white">
                {monthTitle(viewYear, viewMonth0)}
              </h2>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800/60"
                aria-label="Next month"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-sm">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, i) => {
                if (!cell.iso) {
                  return (
                    <div
                      key={`pad-${i}`}
                      className="aspect-square min-h-[2.25rem] sm:min-h-[2.75rem]"
                    />
                  );
                }
                const row = monthMap.get(cell.iso);
                const isSelected = cell.iso === selectedISO;
                const isTodayCell = cell.iso === today;
                const todayTasks =
                  showTodayLinesInCells &&
                  isTodayCell &&
                  todayDetail?.tasks?.length
                    ? todayDetail.tasks
                    : null;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedISO(cell.iso!)}
                    className={[
                      "flex min-h-[2.75rem] flex-col rounded-xl border text-sm font-medium transition sm:min-h-[3rem]",
                      todayTasks
                        ? "items-stretch justify-start px-1 pb-1 pt-1.5 text-left sm:min-h-[4rem]"
                        : "aspect-square min-h-[2.25rem] items-center justify-center sm:min-h-[2.75rem]",
                      cellHeatClass(row),
                      isSelected
                        ? "border-rose-400/70 ring-2 ring-rose-400/40"
                        : "border-transparent",
                      isTodayCell ? "font-semibold text-white" : "text-zinc-200",
                    ].join(" ")}
                  >
                    <span
                      className={
                        todayTasks
                          ? "shrink-0 self-center text-sm"
                          : undefined
                      }
                    >
                      {Number(cell.iso.slice(8, 10))}
                    </span>
                    {todayTasks ? (
                      <div className="mt-0.5 min-h-0 w-full flex-1 space-y-0.5 overflow-hidden">
                        {todayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.task_id}
                            className="truncate text-left text-xs font-normal leading-tight text-zinc-100/95 sm:text-sm"
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                        {todayTasks.length > 2 ? (
                          <div className="text-xs font-normal text-zinc-500 sm:text-sm">
                            +{todayTasks.length - 2} more
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <section aria-labelledby="upcoming-heading">
            <h2
              id="upcoming-heading"
              className="mb-2 text-sm font-semibold text-zinc-300"
            >
              Next two weeks
            </h2>
            <div
              className={`${glassCard} flex flex-wrap gap-2`}
              aria-busy={upcomingLoading}
            >
              {upcomingLoading ? (
                <p className="text-sm text-zinc-500">Loading…</p>
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-zinc-500">No data yet.</p>
              ) : (
                upcoming.map((r) => {
                  const ds = r.date.slice(0, 10);
                  const short = ds.slice(5);
                  const isSel = ds === selectedISO;
                  return (
                    <button
                      key={ds}
                      type="button"
                      onClick={() => {
                        setSelectedISO(ds);
                        const [y, m] = ds.split("-").map(Number);
                        if (y && m) {
                          setViewYear(y);
                          setViewMonth0(m - 1);
                        }
                      }}
                      className={[
                        "rounded-lg border px-2 py-1 text-sm transition",
                        cellHeatClass(r),
                        isSel
                          ? "border-rose-400/60"
                          : "border-white/5 hover:border-white/15",
                      ].join(" ")}
                    >
                      {short}{" "}
                      <span className="text-zinc-400">
                        ({r.count}
                        {r.global_rest ? " · rest" : ""})
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside
          className={`${glassCard} flex flex-col gap-4 ${dayPanelStickyClass}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-lg font-medium leading-tight text-white">
                {selectedLabel}
              </h2>
              {selectedISO === today ? (
                <p className="mt-1 text-sm text-emerald-400/90">Today</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedISO(today);
                const [y, m] = today.split("-").map(Number);
                if (y && m) {
                  setViewYear(y);
                  setViewMonth0(m - 1);
                }
              }}
              className="text-sm font-medium text-rose-300/90 underline-offset-2 hover:underline"
            >
              Jump to today
            </button>
          </div>

          {dayLoading ? (
            <p className="text-sm text-zinc-500">Loading day…</p>
          ) : !dayDetail ? (
            <p className="text-sm text-zinc-500">Could not load this day.</p>
          ) : (
            <>
              {hideDayTaskList ? null : (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:text-sm">
                    Tasks
                  </h3>
                  {dayDetail.tasks.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No tasks for this date. Monthly goals only show in their
                      calendar month — add one below.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {dayDetail.tasks.map((t) => (
                        <li
                          key={t.task_id}
                          className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <input
                                type="checkbox"
                                checked={t.completed}
                                disabled={dayDetail.global_rest}
                                onChange={() =>
                                  void toggleComplete(t.task_id, t.completed)
                                }
                                className="mt-0.5 size-[1.125rem] shrink-0 rounded border-zinc-500 bg-zinc-950 text-emerald-500 disabled:opacity-40"
                                aria-label={`Complete “${t.title}”`}
                              />
                              <div className="min-w-0">
                                <Link
                                  to={`/tasks/${t.task_id}`}
                                  className="font-medium text-white hover:text-rose-200/95 [overflow-wrap:anywhere]"
                                >
                                  {t.title}
                                </Link>
                                {t.task_kind === "daily" &&
                                formatTimeWindowLabel(
                                  t.window_start,
                                  t.window_end,
                                  timeFormat,
                                ) ? (
                                  <p className="mt-0.5 text-xs tabular-nums text-cyan-400/85">
                                    {formatTimeWindowLabel(
                                      t.window_start,
                                      t.window_end,
                                      timeFormat,
                                    )}
                                  </p>
                                ) : null}
                                <div className="mt-0.5 flex flex-wrap gap-1.5">
                                  {t.task_kind === "monthly" ? (
                                    <span className="inline-block rounded border border-rose-500/20 bg-rose-950/40 px-2 py-0.5 text-xs uppercase tracking-wide text-rose-100/90">
                                      Month
                                    </span>
                                  ) : (
                                    <span className="inline-block rounded border border-zinc-600/40 bg-zinc-800/50 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                                      Daily
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-amber-200/85">
                              <input
                                type="checkbox"
                                checked={t.rest_today}
                                disabled={dayDetail.global_rest}
                                onChange={() =>
                                  void toggleTaskRest(t.task_id, t.rest_today)
                                }
                                className="size-3.5 rounded border-zinc-500 disabled:opacity-40"
                              />
                              Rest
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!hideDayAddTask ? (
                <form
                  onSubmit={(e) => void handleAddTask(e)}
                  className={`${glassCardSubtle} space-y-2 p-3`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 sm:text-sm">
                      Add task
                    </span>
                    <span className="text-xs text-zinc-500 sm:text-sm" aria-hidden>
                      +
                    </span>
                  </div>
                  <div
                    className="flex rounded-lg border border-white/10 bg-zinc-950/40 p-0.5"
                    role="group"
                    aria-label="Task type"
                  >
                    <button
                      type="button"
                      onClick={() => setAddKind("daily")}
                      className={[
                        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition",
                        addKind === "daily"
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300",
                      ].join(" ")}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddKind("monthly")}
                      className={[
                        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition",
                        addKind === "monthly"
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300",
                      ].join(" ")}
                    >
                      This month
                    </button>
                  </div>
                  {addKind === "monthly" ? (
                    <p className="text-sm leading-snug text-zinc-500">
                      Goal for{" "}
                      {new Date(
                        firstDayOfMonthForLocalISO(selectedISO) + "T12:00:00",
                      ).toLocaleString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                      .
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label htmlFor={addInputId} className="sr-only">
                      New task title
                    </label>
                    <input
                      id={addInputId}
                      type="text"
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      placeholder="e.g. Morning run"
                      autoComplete="off"
                      disabled={addBusy || dayLoading}
                      className={`min-h-10 flex-1 px-3 py-2 text-sm ${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
                    />
                    <button
                      type="submit"
                      disabled={
                        addBusy || dayLoading || addTitle.trim().length === 0
                      }
                      className="min-h-10 shrink-0 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 px-4 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_-8px_rgba(52,211,153,0.45)] transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addBusy ? "…" : "Add"}
                    </button>
                  </div>
                </form>
              ) : null}

              {!hideGlobalRest ? (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-950/25 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={dayDetail.global_rest}
                    onChange={() => void toggleGlobalRest()}
                    className="size-4 rounded border-zinc-500 bg-zinc-950 text-violet-400"
                  />
                  <span className="text-sm text-violet-100/95">
                    Whole day rest (all habits)
                  </span>
                </label>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
