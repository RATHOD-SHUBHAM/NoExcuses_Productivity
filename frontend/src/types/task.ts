export type Task = {
  id: string;
  title: string;
  completedToday: boolean;
  /** Per-task rest for local “today” (streak bridging for this habit only). */
  restToday: boolean;
  createdAt?: string;
  /** `monthly` goals belong to one calendar month (`monthBucket`); `daily` todos repeat. */
  taskKind: "daily" | "monthly";
  /** First day of month (YYYY-MM-DD) when `taskKind === "monthly"`; otherwise null. */
  monthBucket: string | null;
  /** Optional same-day local window (24h HH:MM) for daily habits only. */
  windowStart?: string | null;
  windowEnd?: string | null;
  /** When set, this daily only appears on that calendar day (today’s plan). Null = repeat every day. */
  dailyForDate?: string | null;
  /** Completed days in the goal’s calendar month (monthly-only; for home list without checkbox). */
  daysCompletedThisMonth?: number;
  /** Days in that calendar month (28–31). */
  daysInMonth?: number;
};
