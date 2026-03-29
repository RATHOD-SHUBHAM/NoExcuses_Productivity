import { formatLocalISODate } from "./date";

/** Next Saturday to plan toward (local). If today is Saturday, returns today; if Sunday, next Saturday. */
export function upcomingWeekendSaturdayISO(now = new Date()): string {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  let add = 0;
  if (day === 6) {
    add = 0;
  } else if (day === 0) {
    add = 6;
  } else {
    add = 6 - day;
  }
  d.setDate(d.getDate() + add);
  return formatLocalISODate(d);
}

/** e.g. "Sat, Mar 28 – Sun, Mar 29" */
export function formatWeekendRangeLabel(saturdayIso: string): string {
  const [y, m, da] = saturdayIso.split("-").map(Number);
  const sat = new Date(y, m - 1, da);
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  return `${sat.toLocaleDateString(undefined, opts)} – ${sun.toLocaleDateString(undefined, opts)}`;
}
