/** Local calendar day as YYYY-MM-DD. */
export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday of the week containing `d` (local). */
export function getMonday(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** Oldest → newest: last `n` calendar days including today. */
export function lastNDaysInclusive(n: number): Date[] {
  const end = startOfLocalDay(new Date());
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(startOfLocalDay(d));
  }
  return days;
}

/** One week column: Mon → Sun; `null` = day outside [rangeStart, rangeEnd]. */
export type WeekColumn = {
  /** Monday (local) of this column. */
  weekStartMonday: Date;
  cells: (Date | null)[];
};

/**
 * GitHub-style: one column per week (Mon→Sun); cells outside the range are `null`.
 */
export function contributionWeekColumns(
  rangeStart: Date,
  rangeEnd: Date,
): WeekColumn[] {
  const s = startOfLocalDay(rangeStart);
  const e = startOfLocalDay(rangeEnd);
  const weeks: WeekColumn[] = [];
  let curMonday = getMonday(s);
  while (curMonday <= e) {
    const cells: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curMonday);
      d.setDate(curMonday.getDate() + i);
      if (d < s || d > e) cells.push(null);
      else cells.push(startOfLocalDay(d));
    }
    weeks.push({
      weekStartMonday: startOfLocalDay(new Date(curMonday)),
      cells,
    });
    const next = new Date(curMonday);
    next.setDate(next.getDate() + 7);
    curMonday = next;
  }
  return weeks;
}

/** Short month label when the week starts a new month vs the previous column. */
export function monthLabelForWeekColumn(
  weekStartMonday: Date,
  previousWeekMonday: Date | null,
): string {
  if (!previousWeekMonday) {
    return weekStartMonday.toLocaleDateString(undefined, { month: "short" });
  }
  const y1 = weekStartMonday.getFullYear();
  const y0 = previousWeekMonday.getFullYear();
  const m1 = weekStartMonday.getMonth();
  const m0 = previousWeekMonday.getMonth();
  if (y1 !== y0) {
    return weekStartMonday.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }
  if (m1 !== m0) {
    return weekStartMonday.toLocaleDateString(undefined, { month: "short" });
  }
  return "";
}

/** Tooltip for the column header (what week this column is). */
export function weekColumnTitle(weekStartMonday: Date): string {
  const sun = new Date(weekStartMonday);
  sun.setDate(sun.getDate() + 6);
  const mon = weekStartMonday.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const sunStr = sun.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Column = one week (Mon–Sun): ${mon} → ${sunStr}`;
}

export type HeatmapDayStatus = "done" | "rest" | "none";

function humanDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Readable hover text for one day cell. */
export function dayCellHoverTitle(d: Date, completed: boolean): string {
  return dayCellHoverTitleFromStatus(
    d,
    completed ? "done" : "none",
  );
}

export function dayCellHoverTitleFromStatus(
  d: Date,
  status: HeatmapDayStatus,
): string {
  const human = humanDateLong(d);
  const label =
    status === "done"
      ? "Completed"
      : status === "rest"
        ? "Rest day"
        : "Off";
  return `${human} — ${label}`;
}
