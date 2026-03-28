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
