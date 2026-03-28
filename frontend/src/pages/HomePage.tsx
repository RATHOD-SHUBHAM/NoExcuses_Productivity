import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AddTaskSection } from "../components/home/AddTaskSection";
import { ConsistencyGraphSection } from "../components/home/ConsistencyGraphSection";
import { QuoteSection } from "../components/home/QuoteSection";
import { RestDayExportSection } from "../components/home/RestDayExportSection";
import { TaskListSection } from "../components/home/TaskListSection";
import { WeeklyReviewSection } from "../components/home/WeeklyReviewSection";
import * as tasksApi from "../api/tasksApi";
import { todayLocalISO } from "../lib/date";
import { alertError, pageContainer } from "../lib/ui";
import type { Task } from "../types/task";

function logsShowCompletedToday(
  logs: { date: string; completed: boolean }[],
  today: string,
): boolean {
  return logs.some(
    (l) => l.date.slice(0, 10) === today && l.completed === true,
  );
}

async function tasksWithTodayFromApi(): Promise<Task[]> {
  const list = await tasksApi.getAllTasks();
  const today = todayLocalISO();
  let restRows: { task_id: string }[] = [];
  try {
    restRows = await tasksApi.listTaskRestDaysOnDate(today);
  } catch {
    restRows = [];
  }
  const restSet = new Set(restRows.map((r) => r.task_id));
  const enriched = await Promise.all(
    list.map(async (t) => {
      const logs = await tasksApi.getTaskLogs(t.id);
      return {
        id: t.id,
        title: t.title,
        createdAt: t.created_at,
        completedToday: logsShowCompletedToday(logs, today),
        restToday: restSet.has(t.id),
      };
    }),
  );
  return enriched;
}

export function HomePage() {
  const { session } = useAuth();
  const uid = session?.user?.id ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [graphPoints, setGraphPoints] = useState<
    {
      label: string;
      completed: number;
      restMarks: number;
      globalRest: boolean;
    }[]
  >([]);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphLabel, setGraphLabel] = useState("");

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

  const loadGraph = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    setGraphError(null);
    if (!silent) setGraphLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      setGraphLabel(
        `${year}-${String(month).padStart(2, "0")} (monthly)`,
      );
      const rows = await tasksApi.getMonthlyCompletions(year, month);
      const points = rows.map((r) => ({
        label: r.date.slice(5),
        completed: r.count,
        restMarks: r.rest_marks ?? 0,
        globalRest: r.global_rest ?? false,
      }));
      setGraphPoints(points);
    } catch (e) {
      setGraphError(
        e instanceof Error ? e.message : "Something went wrong",
      );
      setGraphPoints([]);
    } finally {
      if (!silent) setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    void loadTasks();
  }, [loadTasks, uid]);

  useEffect(() => {
    if (!uid) return;
    void loadGraph();
  }, [loadGraph, uid]);

  async function addTask(title: string) {
    setTasksError(null);
    try {
      const created = await tasksApi.createTask(title);
      setTasks((prev) => [
        {
          id: created.id,
          title: created.title,
          createdAt: created.created_at,
          completedToday: false,
          restToday: false,
        },
        ...prev,
      ]);
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
      await loadGraph({ silent: true });
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
      await loadGraph({ silent: true });
    } catch (e) {
      setTasks(prev);
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function toggleRestToday(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const today = todayLocalISO();
    const next = !task.restToday;
    const prev = tasks;
    setTasks((p) =>
      p.map((t) => (t.id === id ? { ...t, restToday: next } : t)),
    );

    try {
      if (next) {
        await tasksApi.addTaskRestDay(id, today);
      } else {
        await tasksApi.deleteTaskRestDay(id, today);
      }
      await loadGraph({ silent: true });
    } catch (e) {
      setTasks(prev);
      setTasksError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  return (
    <div
      className={`${pageContainer} flex min-h-dvh flex-col gap-10 sm:gap-12 lg:gap-14`}
    >
      <header className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/90 shadow-lg shadow-rose-950/20 backdrop-blur-md sm:text-[11px]">
          Habit tracker
        </p>
        <h1 className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text font-display text-4xl font-normal italic leading-tight tracking-tight text-transparent sm:text-5xl sm:leading-[1.1]">
          No
          <span className="not-italic">
            <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-amber-200 bg-clip-text font-sans text-[0.92em] font-bold tracking-tight text-transparent">
              Excuses
            </span>
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-zinc-400 sm:text-base">
          Stay consistent. One screen, no clutter.
        </p>
      </header>

      {tasksError && (
        <div role="alert" className={alertError}>
          <p className="font-medium text-red-100">Something went wrong</p>
          <p className="mt-1 text-xs text-red-200/80">{tasksError}</p>
        </div>
      )}

      <QuoteSection />

      <TaskListSection
        tasks={tasks}
        loading={tasksLoading}
        onToggleComplete={toggleComplete}
        onToggleRestToday={toggleRestToday}
        onDelete={deleteTask}
      />

      <AddTaskSection onAdd={addTask} disabled={tasksLoading} />

      <WeeklyReviewSection />

      <RestDayExportSection
        onRestDayChanged={() => void loadGraph({ silent: true })}
      />

      <ConsistencyGraphSection
        data={graphPoints}
        loading={graphLoading}
        error={graphError}
        subtitle={graphLabel}
        taskCount={Math.max(tasks.length, 1)}
      />
    </div>
  );
}
