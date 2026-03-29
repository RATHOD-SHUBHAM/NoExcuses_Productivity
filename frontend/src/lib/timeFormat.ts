/** User-facing clock style for planned time windows (storage stays 24h `HH:MM`). */
export type TimeFormat = "12" | "24";

export const TIME_FORMAT_STORAGE_KEY = "noexcuses-time-format";

export function parseHhMm(raw: string | null | undefined): { h: number; m: number } | null {
  const s = raw?.trim();
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }
  return { h, m: min };
}

export function toHhMm(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhMmTo12Parts(
  hhmm: string,
): { h12: number; minute: number; ampm: "AM" | "PM" } | null {
  const p = parseHhMm(hhmm);
  if (!p) return null;
  const ampm = p.h >= 12 ? "PM" : "AM";
  let h12 = p.h % 12;
  if (h12 === 0) h12 = 12;
  return { h12, minute: p.m, ampm };
}

export function from12Parts(h12: number, minute: number, ampm: "AM" | "PM"): string {
  if (h12 < 1 || h12 > 12 || minute < 0 || minute > 59) {
    return "00:00";
  }
  let h24: number;
  if (ampm === "AM") {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  return toHhMm(h24, minute);
}

/** Single `HH:MM` (24h) string for labels. */
export function formatHhmmForDisplay(hhmm: string, format: TimeFormat): string {
  const p = parseHhMm(hhmm);
  if (!p) return hhmm.trim();
  if (format === "24") return toHhMm(p.h, p.m);
  const parts = hhMmTo12Parts(hhmm);
  if (!parts) return hhmm.trim();
  return `${parts.h12}:${String(parts.minute).padStart(2, "0")} ${parts.ampm}`;
}

export function readStoredTimeFormat(): TimeFormat {
  try {
    const v = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    if (v === "12" || v === "24") return v;
  } catch {
    /* ignore */
  }
  return "24";
}

export function persistTimeFormat(f: TimeFormat): void {
  try {
    localStorage.setItem(TIME_FORMAT_STORAGE_KEY, f);
  } catch {
    /* ignore */
  }
}
