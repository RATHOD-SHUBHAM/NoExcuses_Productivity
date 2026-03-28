/** Monday of the week containing `d` (local calendar), as YYYY-MM-DD. */
export function mondayLocalISO(d = new Date()): string {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short label e.g. "Mar 3, 2026" for a week’s Monday. */
export function formatWeekLabel(mondayIso: string): string {
  const [y, mo, da] = mondayIso.split("-").map(Number);
  const d = new Date(y, mo - 1, da);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
