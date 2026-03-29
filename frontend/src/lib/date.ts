/** Local calendar date as YYYY-MM-DD (aligns with browser timezone). */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calendar day in the **browser timezone** for an ISO timestamp.
 * Prefer this over `iso.slice(0, 10)` (UTC) when pairing with `todayLocalISO()`.
 */
export function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return todayLocalISO();
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive YYYY-MM-DD range covering both ends (safe for API from/to when order might invert). */
export function inclusiveLocalRange(a: string, b: string): { from: string; to: string } {
  const [from, to] = [a, b].sort();
  return { from: from!, to: to! };
}

/** First calendar day of the current month in the browser timezone (YYYY-MM-DD). */
export function firstDayOfMonthLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** First day of the month containing `iso` (YYYY-MM-DD), local calendar (for monthly goals on that month). */
export function firstDayOfMonthForLocalISO(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) {
    return firstDayOfMonthLocalISO();
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Human label for a month-bucket date (e.g. `2026-03-01` → "March 2026"). */
export function formatMonthYearFromBucket(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Local calendar date as YYYY-MM-DD from a Date (no UTC shift). */
export function formatLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add calendar days to a local YYYY-MM-DD (browser timezone). */
export function addDaysLocalISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) {
    return todayLocalISO();
  }
  d.setDate(d.getDate() + deltaDays);
  return formatLocalISODate(d);
}

export type RhythmChartWindow = { from: string; to: string; label: string };

/**
 * Rhythm chart: a few days of past, today, a short future slice — all in local time.
 * Defaults: 7 days back, 5 days ahead (inclusive span).
 */
export function getRhythmChartWindow(options?: {
  daysPast?: number;
  daysFuture?: number;
}): RhythmChartWindow {
  const daysPast = options?.daysPast ?? 7;
  const daysFuture = options?.daysFuture ?? 5;
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = new Date(t);
  from.setDate(from.getDate() - daysPast);
  const to = new Date(t);
  to.setDate(to.getDate() + daysFuture);
  const fromStr = formatLocalISODate(from);
  const toStr = formatLocalISODate(to);
  const label =
    from.getFullYear() === to.getFullYear()
      ? `${fromStr.slice(5)} → ${toStr.slice(5)}`
      : `${fromStr} → ${toStr}`;
  return { from: fromStr, to: toStr, label };
}
