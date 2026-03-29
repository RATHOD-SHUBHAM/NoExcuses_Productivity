import type { Task } from "../types/task";

/** Order dailies by planned window start, then title; no window sorts last. */
export function sortDailiesByWindow(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aw = a.windowStart ?? "\uffff";
    const bw = b.windowStart ?? "\uffff";
    if (aw !== bw) return aw.localeCompare(bw);
    return a.title.localeCompare(b.title);
  });
}
