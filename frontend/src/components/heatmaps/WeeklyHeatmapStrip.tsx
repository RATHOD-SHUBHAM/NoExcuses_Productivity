import {
  dateKeyLocal,
  dayCellHoverTitleFromStatus,
  type HeatmapDayStatus,
} from "../../lib/heatmapDates";
import { glassCardSubtle } from "../../lib/ui";

type Props = {
  days: Date[];
  logCompletedByDate: Map<string, boolean>;
  /** Global and/or per-task rest for this habit (date key → true). */
  restByDate?: Map<string, boolean>;
  todayKey: string;
  accent: { done: string; dim: string; rest: string };
};

function weekdayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function cellStatus(
  key: string,
  logCompletedByDate: Map<string, boolean>,
  restByDate: Map<string, boolean> | undefined,
): HeatmapDayStatus {
  if (logCompletedByDate.get(key) === true) return "done";
  if (restByDate?.get(key) === true) return "rest";
  return "none";
}

export function WeeklyHeatmapStrip({
  days,
  logCompletedByDate,
  restByDate,
  todayKey,
  accent,
}: Props) {
  const restMap = restByDate ?? new Map<string, boolean>();
  return (
    <div className={`${glassCardSubtle} px-2 py-4 sm:px-3`}>
      <div className="flex justify-between gap-1.5 sm:gap-2">
        {days.map((d) => {
          const key = dateKeyLocal(d);
          const isToday = key === todayKey;
          const status = cellStatus(key, logCompletedByDate, restMap);
          const bg =
            status === "done"
              ? accent.done
              : status === "rest"
                ? accent.rest
                : accent.dim;
          const ring =
            status === "done"
              ? `0 0 0 1px ${accent.done}40`
              : status === "rest"
                ? `0 0 0 1px ${accent.rest}50`
                : `inset 0 0 0 1px rgba(255,255,255,0.05)`;
          return (
            <div
              key={key}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span
                  className={`text-[10px] uppercase tracking-wide ${isToday ? "font-semibold text-white" : "text-zinc-500"}`}
                >
                  {weekdayShort(d)}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${isToday ? "font-semibold text-white" : "text-zinc-500"}`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div
                role="img"
                aria-label={dayCellHoverTitleFromStatus(d, status)}
                title={dayCellHoverTitleFromStatus(d, status)}
                className="aspect-square w-full max-w-11 rounded-md transition-colors sm:max-w-10"
                style={{
                  backgroundColor: bg,
                  boxShadow: ring,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
