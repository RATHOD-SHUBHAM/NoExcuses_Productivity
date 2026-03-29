import { type TimeFormat, formatHhmmForDisplay } from "./timeFormat";

/** Format planned window for display (12h or 24h); API storage remains `HH:MM` 24h. */
export function formatTimeWindowLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  format: TimeFormat = "24",
): string | null {
  const s = start?.trim();
  const e = end?.trim();
  if (!s || !e) return null;
  return `${formatHhmmForDisplay(s, format)}–${formatHhmmForDisplay(e, format)}`;
}
