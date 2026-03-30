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

/** Unchecked first, checked last; then window order, then title. */
export function sortDailiesForHome(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ac = a.completedToday ? 1 : 0;
    const bc = b.completedToday ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const aw = a.windowStart ?? "\uffff";
    const bw = b.windowStart ?? "\uffff";
    if (aw !== bw) return aw.localeCompare(bw);
    return a.title.localeCompare(b.title);
  });
}

/** Unchecked first, checked last; then title. */
export function sortMonthlyForHome(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ac = a.completedToday ? 1 : 0;
    const bc = b.completedToday ? 1 : 0;
    if (ac !== bc) return ac - bc;
    return a.title.localeCompare(b.title);
  });
}
