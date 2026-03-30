import { localDateKeyFromIso } from "./date";
import type { Task } from "../types/task";

/** Matches backend visibility: recurring dailies apply from created date; day-scoped apply on that date only. */
export function dailyTaskAppliesOnLocalDay(task: Task, dayYmd: string): boolean {
  if (task.taskKind !== "daily") return false;
  const day = dayYmd.slice(0, 10);
  if (task.dailyForDate != null && task.dailyForDate.length > 0) {
    return task.dailyForDate.slice(0, 10) === day;
  }
  const created = task.createdAt
    ? localDateKeyFromIso(task.createdAt)
    : day;
  return created <= day;
}
