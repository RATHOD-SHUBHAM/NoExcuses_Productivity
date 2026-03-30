import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarView } from "../components/calendar/CalendarView";
import { GlobalRestTodayControl } from "../components/home/GlobalRestTodayControl";
import { UnifiedAddTaskBar } from "../components/home/UnifiedAddTaskBar";
import { WeekendPlansSection } from "../components/home/WeekendPlansSection";
import {
  ConsistencyGraphSection,
  type ChartPoint,
} from "../components/home/ConsistencyGraphSection";
import { ProductivitySummary } from "../components/home/ProductivitySummary";
import { QuoteSection } from "../components/home/QuoteSection";
import { TaskListSection } from "../components/home/TaskListSection";
import { WeeklyReviewSection } from "../components/home/WeeklyReviewSection";
import { YesterdayCheckinSummary } from "../components/home/YesterdayCheckinSummary";
import * as tasksApi from "../api/tasksApi";
import { dailyTaskAppliesOnLocalDay } from "../lib/dailyTaskAppliesOnDay";
import {
  firstDayOfMonthLocalISO,
  getRhythmChartWindow,
  todayLocalISO,
} from "../lib/date";
import {
  alertError,
  homeFeaturePanel,
  homePanelPad,
  pageContainerWide,
} from "../lib/ui";
import { SectionHeading } from "../components/ui/SectionHeading";
import { sortDailiesByWindow } from "../lib/sortTasks";
import type { Task } from "../types/task";

function logsShowCompletedToday(
  logs: { date: string; completed: boolean }[],
  today: string,
): boolean {
  return logs.some(
    (l) => l.date.slice(0, 10) === today && l.completed === true,
  );
}

function countCompletedDaysInBucketMonth(
  logs: { date: string; completed: boolean }[],
  bucketFirstDay: string,
): { completed: number; daysInMonth: number } {
  const d = new Date(bucketFirstDay + "T12:00:00");
  if (Number.isNaN(d.getTime())) {
    return { completed: 0, daysInMonth: 30 };
  }
  const y = d.getFullYear();
  const m = d.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(daysInMonth)}`;
  let completed = 0;
  for (const l of logs) {
    if (!l.completed) continue;
    const ds = l.date.slice(0, 10);
    if (ds >= start && ds <= end) {
      completed += 1;
    }
  }
  return { completed, daysInMonth };
}

async function tasksWithTodayFromApi(): Promise<Task[]> {
  const list = await tasksApi.getAllTasks();
  const today = todayLocalISO();
  const enriched = await Promise.all(
    list.map(async (t) => {
      const logs = await tasksApi.getTaskLogs(t.id);
      const mb =
        t.month_bucket != null && String(t.month_bucket).length > 0
          ? String(t.month_bucket).slice(0, 10)
          : null;
      const taskKind: Task["taskKind"] =
        t.task_kind === "monthly" ? "monthly" : "daily";
      const ws =
        t.window_start != null && String(t.window_start).trim()
          ? String(t.window_start).trim()
          : null;
      const we =
        t.window_end != null && String(t.window_end).trim()
          ? String(t.window_end).trim()
          : null;
      const dfd =
        taskKind === "daily" &&
        t.daily_for_date != null &&
        String(t.daily_for_date).length > 0
          ? String(t.daily_for_date).slice(0, 10)
          : null;
      const base: Task = {
        id: t.id,
        title: t.title,
        createdAt: t.created_at,
        completedToday: logsShowCompletedToday(logs, today),
        restToday: false,
        taskKind,
        monthBucket: mb,
        windowStart: ws,
        windowEnd: we,
        dailyForDate: dfd,
      };
      if (taskKind === "monthly" && mb) {
        const { completed, daysInMonth } = countCompletedDaysInBucketMonth(
          logs,
          mb,
        );
        base.daysCompletedThisMonth = completed;
        base.daysInMonth = daysInMonth;
      }
      return base;
    }),
  );
  return enriched;
}

function mapRowsToChartPoints(
  rows: Awaited<ReturnType<typeof tasksApi.getMonthlyCompletions>>,
): ChartPoint[] {
  return rows.map((r) => ({
    label: r.date.slice(5),
    completed: r.count,
    restMarks: r.rest_marks ?? 0,
    globalRest: r.global_rest ?? false,
  }));
}

function dailyTasksForHome(tasks: Task[], todayYmd: string): Task[] {
  return tasks.filter(
    (t) => t.taskKind === "daily" && dailyTaskAppliesOnLocalDay(t, todayYmd),
  );
}

export function HomePage() {
  const [searchParams] = useSearchParams();
  const plannerFromNav = searchParams.get("planner") === "open";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [dailyGraphPoints, setDailyGraphPoints] = useState<ChartPoint[]>([]);
  const [monthlyGraphPoints, setMonthlyGraphPoints] = useState<ChartPoint[]>(
    [],
  );
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphLabel, setGraphLabel] = useState("");
  /** Bumps ProductivitySummary when stats change but graph points look unchanged. */
  const [habitActivityTick, setHabitActivityTick] = useState(0);
  /** Bumps calendar month/day fetch when whole-day rest toggles from Home. */
  const [globalRestTick, setGlobalRestTick] = useState(0);

  const loadTasks = useCallback(async () => {
    setTasksError(null);
    setTasksLoading(true);
    try {
      const next = await tasksWithTodayFromApi();
      setTasks(next);
    } catch (e) {
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadGraphs = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    setGraphError(null);
    if (!silent) setGraphLoading(true);
    try {
      const w = getRhythmChartWindow({ daysPast: 7, daysFuture: 5 });
      setGraphLabel(w.label);
      const monthBucket = firstDayOfMonthLocalISO();
      const [dailyRows, monthlyRows] = await Promise.all([
        tasksApi.getMonthlyCompletions({
          taskKind: "daily",
          from: w.from,
          to: w.to,
        }),
        tasksApi.getMonthlyCompletions({
          taskKind: "monthly",
          from: w.from,
          to: w.to,
          monthBucket,
        }),
      ]);
      setDailyGraphPoints(mapRowsToChartPoints(dailyRows));
      setMonthlyGraphPoints(mapRowsToChartPoints(monthlyRows));
    } catch (e) {
      setGraphError(
        e instanceof Error ? e.message : "Something went wrong",
      );
      setDailyGraphPoints([]);
      setMonthlyGraphPoints([]);
    } finally {
      if (!silent) setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadGraphs();
  }, [loadGraphs]);

  /** When the local calendar day rolls over (tab open overnight or return from background), reload so dailies/monthlies reflect “today” only. */
  const lastLocalDayRef = useRef(todayLocalISO());
  useEffect(() => {
    const syncIfNewCalendarDay = () => {
      const now = todayLocalISO();
      if (now === lastLocalDayRef.current) return;
      lastLocalDayRef.current = now;
      void loadTasks();
      void loadGraphs({ silent: true });
      setHabitActivityTick((n) => n + 1);
      setGlobalRestTick((n) => n + 1);
    };
    const id = window.setInterval(syncIfNewCalendarDay, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") syncIfNewCalendarDay();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", syncIfNewCalendarDay);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", syncIfNewCalendarDay);
    };
  }, [loadTasks, loadGraphs]);

  useEffect(() => {
    if (!plannerFromNav) {
      return;
    }
    const id = window.setTimeout(() => {
      document
        .getElementById("calendar")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [plannerFromNav]);

  const bucket = firstDayOfMonthLocalISO();
  const todayYmd = todayLocalISO();
  const slotsPerDay = useMemo(
    () =>
      Math.max(
        1,
        dailyTasksForHome(tasks, todayYmd).length +
          tasks.filter(
            (t) => t.taskKind === "monthly" && t.monthBucket === bucket,
          ).length,
      ),
    [tasks, bucket, todayYmd],
  );

  const summaryRefreshKey = useMemo(
    () =>
      [
        slotsPerDay,
        dailyGraphPoints.map((p) => p.completed).join(","),
        monthlyGraphPoints.map((p) => p.completed).join(","),
      ].join("|"),
    [slotsPerDay, dailyGraphPoints, monthlyGraphPoints],
  );

  const refreshHomeFromCalendar = useCallback(async () => {
    await loadGraphs({ silent: true });
    await loadTasks();
    setHabitActivityTick((n) => n + 1);
  }, [loadGraphs, loadTasks]);

  /** Calendar embed does not see React state for new tasks — bump when task ids change. */
  const calendarTasksKey = useMemo(
    () =>
      tasks
        .map((t) => t.id)
        .sort()
        .join(","),
    [tasks],
  );

  async function addMonthlyGoal(title: string) {
    setTasksError(null);
    const bucket = firstDayOfMonthLocalISO();
    try {
      const created = await tasksApi.createTask(title, {
        taskKind: "monthly",
        monthBucket: bucket,
      });
      const mb =
        created.month_bucket != null && String(created.month_bucket).length > 0
          ? String(created.month_bucket).slice(0, 10)
          : bucket;
      setTasks((prev) => [
        {
          id: created.id,
          title: created.title,
          createdAt: created.created_at,
          completedToday: false,
          restToday: false,
          taskKind: "monthly",
          monthBucket: mb,
        },
        ...prev,
      ]);
      await loadGraphs({ silent: true });
      setHabitActivityTick((n) => n + 1);
    } catch (e) {
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function addDailyTodo(
    title: string,
    opts?: {
      windowStart?: string | null;
      windowEnd?: string | null;
      recurringDaily?: boolean;
    },
  ) {
    setTasksError(null);
    const today = todayLocalISO();
    try {
      const created = await tasksApi.createTask(title, {
        taskKind: "daily",
        windowStart: opts?.windowStart,
        windowEnd: opts?.windowEnd,
        dailyForDate: opts?.recurringDaily ? null : today,
      });
      const ws =
        created.window_start != null && String(created.window_start).trim()
          ? String(created.window_start).trim()
          : null;
      const we =
        created.window_end != null && String(created.window_end).trim()
          ? String(created.window_end).trim()
          : null;
      const cdf =
        created.daily_for_date != null &&
        String(created.daily_for_date).length > 0
          ? String(created.daily_for_date).slice(0, 10)
          : null;
      setTasks((prev) => [
        {
          id: created.id,
          title: created.title,
          createdAt: created.created_at,
          completedToday: false,
          restToday: false,
          taskKind: "daily",
          monthBucket: null,
          windowStart: ws,
          windowEnd: we,
          dailyForDate: cdf,
        },
        ...prev,
      ]);
      await loadGraphs({ silent: true });
      setHabitActivityTick((n) => n + 1);
    } catch (e) {
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function deleteTask(id: string) {
    setTasksError(null);
    try {
      await tasksApi.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await loadGraphs({ silent: true });
      setHabitActivityTick((n) => n + 1);
    } catch (e) {
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function toggleComplete(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const today = todayLocalISO();
    const next = !task.completedToday;
    const prev = tasks;
    setTasks((p) =>
      p.map((t) =>
        t.id === id ? { ...t, completedToday: next } : t,
      ),
    );

    try {
      await tasksApi.markTaskComplete(id, {
        date: today,
        ...(next ? {} : { completed: false }),
      });
      await loadGraphs({ silent: true });
      setHabitActivityTick((n) => n + 1);
    } catch (e) {
      setTasks(prev);
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  return (
    <div
      className={`${pageContainerWide} flex min-h-dvh flex-col gap-6 sm:gap-7 lg:gap-8`}
    >
      <header className="border-b border-white/[0.06] pb-6 sm:pb-8">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="text-center lg:text-left">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r from-white/[0.07] to-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300/90 shadow-[0_8px_32px_-12px_rgba(244,63,94,0.35)] backdrop-blur-md sm:text-sm">
              Habits & accountability
            </p>
            <h1 className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text font-display text-4xl font-normal italic leading-tight tracking-tight text-transparent sm:text-5xl sm:leading-[1.1]">
              No
              <span className="not-italic">
                <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-amber-200 bg-clip-text font-sans text-[0.92em] font-bold tracking-tight text-transparent">
                  Excuses
                </span>
              </span>
            </h1>
          </div>
          <p className="max-w-lg text-pretty text-center text-sm leading-relaxed text-zinc-400 lg:max-w-md lg:text-right lg:text-base">
            Build habits you can see, plan what actually matters, and stay
            consistent — without the noise.
          </p>
        </div>
      </header>

      {tasksError && (
        <div role="alert" className={alertError}>
          <p className="font-medium text-red-100">Something went wrong</p>
          <p className="mt-1 text-sm text-red-200/80">{tasksError}</p>
        </div>
      )}

      <QuoteSection compact />

      {/* Main dashboard: work column + sticky planner */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <UnifiedAddTaskBar
            onAddDaily={addDailyTodo}
            onAddMonthly={addMonthlyGoal}
            disabled={tasksLoading}
            compact
          />

          <div className={`${homeFeaturePanel} ${homePanelPad}`}>
            <SectionHeading id="check-in-heading">Check in</SectionHeading>
            <div className="mb-5 space-y-3">
              <GlobalRestTodayControl
                disabled={tasksLoading}
                onChanged={async () => {
                  await refreshHomeFromCalendar();
                  setGlobalRestTick((n) => n + 1);
                }}
              />
              <YesterdayCheckinSummary
                refreshKey={`${habitActivityTick}|${globalRestTick}`}
              />
            </div>
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 md:items-start">
              <TaskListSection
                sectionHeadingId="monthly-goals-heading"
                sectionTitle="Monthly"
                emptyHint="Add a monthly goal above."
                showKindBadge={false}
                tasks={tasks.filter(
                  (t) =>
                    t.taskKind === "monthly" && t.monthBucket === bucket,
                )}
                loading={tasksLoading}
                onToggleComplete={toggleComplete}
                onDelete={deleteTask}
              />
              <TaskListSection
                sectionHeadingId="daily-todos-heading"
                sectionTitle="Daily"
                emptyHint="Add today’s todos above (or a recurring habit)."
                showKindBadge
                tasks={sortDailiesByWindow(dailyTasksForHome(tasks, todayYmd))}
                loading={tasksLoading}
                onToggleComplete={toggleComplete}
                onDelete={deleteTask}
              />
            </div>
          </div>

          <ProductivitySummary
            slotsPerDay={slotsPerDay}
            refreshKey={`${summaryRefreshKey}|${habitActivityTick}`}
            compact
          />
        </div>

        <aside
          id="calendar"
          className={`scroll-mt-24 lg:col-span-5 lg:sticky lg:top-6 lg:self-start ${homeFeaturePanel} ${homePanelPad} space-y-3`}
        >
          <SectionHeading id="home-calendar-heading">Calendar</SectionHeading>
          <CalendarView
            collapsible
            initialExpanded={plannerFromNav}
            showHero={false}
            formIdSuffix="-home"
            hideDayAddTask
            hideDayTaskList
            hideGlobalRest
            tasksRefreshKey={`${calendarTasksKey}|${globalRestTick}`}
            onHabitDataChanged={refreshHomeFromCalendar}
          />
          <div className="pt-4 border-t border-white/[0.06]">
            <WeekendPlansSection />
          </div>
        </aside>
      </div>

      <div className={`space-y-4 ${homeFeaturePanel} ${homePanelPad}`}>
        <div>
          <SectionHeading id="report-heading">Report</SectionHeading>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-6">
          <ConsistencyGraphSection
            sectionHeadingId="monthly-rhythm-heading"
            sectionTitle="Monthly"
            data={monthlyGraphPoints}
            loading={graphLoading}
            error={graphError}
            subtitle={graphLabel}
            taskCount={Math.max(
              tasks.filter(
                (t) =>
                  t.taskKind === "monthly" &&
                  t.monthBucket === bucket,
              ).length,
              1,
            )}
            footerNote="Monthly goals: completions and rest in this window."
          />
          <ConsistencyGraphSection
            sectionHeadingId="daily-rhythm-heading"
            sectionTitle="Daily"
            data={dailyGraphPoints}
            loading={graphLoading}
            error={graphError}
            subtitle={graphLabel}
            taskCount={Math.max(
              dailyTasksForHome(tasks, todayYmd).length,
              1,
            )}
            footerNote="Daily habits: completions and rest in this window."
          />
        </div>
      </div>

      <div className={`${homeFeaturePanel} ${homePanelPad}`}>
        <WeeklyReviewSection />
      </div>
    </div>
  );
}
