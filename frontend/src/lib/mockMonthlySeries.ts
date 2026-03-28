/** Placeholder series for the consistency graph until backend aggregates exist. */
export type DayPoint = { label: string; completed: number };

export function getMockMonthlySeries(): DayPoint[] {
  const days = 30;
  const today = new Date();
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const completed = Math.max(0, Math.round(3 + Math.sin(i / 3) * 4 + (i % 5)));
    out.push({ label, completed });
  }
  return out;
}
