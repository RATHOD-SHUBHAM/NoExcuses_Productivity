import { type FormEvent, useState } from "react";
import {
  firstDayOfMonthLocalISO,
  formatMonthYearFromBucket,
} from "../../lib/date";
import { glassCardSubtle, inputBase } from "../../lib/ui";
import { PlannedTimeInputs } from "../ui/PlannedTimeInputs";
import { SectionHeading } from "../ui/SectionHeading";

type Props = {
  onAddDaily: (
    title: string,
    opts?: { windowStart?: string | null; windowEnd?: string | null },
  ) => void | Promise<void>;
  onAddMonthly: (title: string) => void | Promise<void>;
  disabled?: boolean;
  /** Shorter helper text for dense layouts. */
  compact?: boolean;
};

/**
 * Single add row for the home dashboard — replaces duplicate monthly + daily add forms.
 */
export function UnifiedAddTaskBar({
  onAddDaily,
  onAddMonthly,
  disabled,
  compact = false,
}: Props) {
  const [kind, setKind] = useState<"daily" | "monthly">("daily");
  const [value, setValue] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t || disabled) return;
    setTimeError(null);

    if (kind === "daily") {
      const ws = windowStart.trim();
      const we = windowEnd.trim();
      if ((ws && !we) || (!ws && we)) {
        setTimeError("Add both start and end time, or leave both empty.");
        return;
      }
      if (ws && we && ws >= we) {
        setTimeError("End time must be after start (same day).");
        return;
      }
      await onAddDaily(t, ws && we ? { windowStart: ws, windowEnd: we } : undefined);
      setWindowStart("");
      setWindowEnd("");
    } else {
      await onAddMonthly(t);
    }
    setValue("");
  }

  const bucket = firstDayOfMonthLocalISO();
  const monthLabel = formatMonthYearFromBucket(bucket);

  return (
    <section
      aria-labelledby="unified-add-heading"
      className={`${glassCardSubtle} border-white/[0.08] ${compact ? "p-3 sm:p-3.5" : "p-3 sm:p-4"}`}
    >
      <SectionHeading id="unified-add-heading">New habit</SectionHeading>
      <p
        className={
          compact
            ? "mb-3 -mt-1 max-w-[40rem] text-sm leading-snug text-zinc-500"
            : "mb-4 -mt-1 max-w-[40rem] text-base leading-relaxed text-zinc-500"
        }
      >
        {compact ? (
          <>
            Daily or monthly goal for{" "}
            <span className="text-zinc-400">{monthLabel}</span>.
          </>
        ) : (
          <>
            Daily repeat (optional time window), or a goal for{" "}
            <span className="text-zinc-400">{monthLabel}</span>.
          </>
        )}
      </p>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <div
            className="flex shrink-0 rounded-xl border border-white/10 bg-zinc-950/50 p-0.5 sm:max-w-[13rem]"
            role="group"
            aria-label="Habit type"
          >
            <button
              type="button"
              onClick={() => {
                setKind("daily");
                setTimeError(null);
              }}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                kind === "daily"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("monthly");
                setTimeError(null);
              }}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                kind === "monthly"
                  ? "bg-rose-500/15 text-rose-100/95 shadow-sm ring-1 ring-rose-500/20"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              Monthly
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="unified-add-input" className="sr-only">
              Habit title
            </label>
            <input
              id="unified-add-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                kind === "daily"
                  ? "Something you’ll check off every day…"
                  : "e.g. Finish the course, gym 12×…"
              }
              autoComplete="off"
              disabled={disabled}
              className={`min-h-11 w-full px-4 py-2.5 text-sm ${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </div>
          <button
            type="submit"
            disabled={disabled || value.trim().length === 0}
            className="min-h-11 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 text-sm font-semibold text-zinc-950 shadow-[0_0_28px_-8px_rgba(52,211,153,0.45)] transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-8"
          >
            Add
          </button>
        </div>

        {kind === "daily" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm text-zinc-500 sm:w-40 sm:shrink-0">
              Planned window (optional)
            </span>
            <PlannedTimeInputs
              startId="unified-window-start"
              endId="unified-window-end"
              startValue={windowStart}
              endValue={windowEnd}
              onStartChange={setWindowStart}
              onEndChange={setWindowEnd}
              disabled={disabled}
            />
          </div>
        ) : null}

        {timeError ? (
          <p className="text-sm text-red-300/90" role="alert">
            {timeError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
