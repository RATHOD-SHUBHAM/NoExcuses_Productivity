import {
  type WeekColumn,
  dateKeyLocal,
  dayCellHoverTitleFromStatus,
  type HeatmapDayStatus,
  monthLabelForWeekColumn,
  weekColumnTitle,
} from "../../lib/heatmapDates";

const ROW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  weeks: WeekColumn[];
  logCompletedByDate: Map<string, boolean>;
  restByDate?: Map<string, boolean>;
  accent: {
    done: string;
    dim: string;
    rest: string;
    missed: string;
    outOfScope: string;
  };
  heatmapApplicableKeys?: Set<string>;
};

function cellStatus(
  key: string,
  logCompletedByDate: Map<string, boolean>,
  restByDate: Map<string, boolean>,
  applicableKeys: Set<string> | undefined,
): HeatmapDayStatus {
  if (applicableKeys !== undefined && !applicableKeys.has(key)) {
    return "out_of_scope";
  }
  if (logCompletedByDate.get(key) === true) return "done";
  if (restByDate.get(key) === true) return "rest";
  if (applicableKeys !== undefined && applicableKeys.has(key)) return "missed";
  return "none";
}

/** Match grid: cell 10px + gap 4px between rows = 14px label row */
const COL_WIDTH_CLASS = "w-2.5";

export function ContributionGrid({
  weeks,
  logCompletedByDate,
  restByDate,
  accent,
  heatmapApplicableKeys,
}: Props) {
  if (weeks.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No days in range yet.</p>
    );
  }

  const restMap = restByDate ?? new Map<string, boolean>();

  return (
    <div className="flex gap-2">
        <div
          className="flex shrink-0 flex-col gap-1 pt-0.5 text-[9px] leading-none text-zinc-500"
          aria-hidden
        >
          <div className="h-3 shrink-0" />
          {ROW_LABELS.map((label) => (
            <div key={label} className="flex h-2.5 items-center">
              {label}
            </div>
          ))}
        </div>
        <div className="min-h-[90px] flex-1 overflow-x-auto pb-1">
          <div className="flex w-max flex-col gap-1.5">
            <div className="flex w-max gap-1" aria-hidden>
              {weeks.map((week, wi) => {
                const prev = wi > 0 ? weeks[wi - 1]!.weekStartMonday : null;
                const label = monthLabelForWeekColumn(
                  week.weekStartMonday,
                  prev,
                );
                const colTitle = weekColumnTitle(week.weekStartMonday);
                return (
                  <div
                    key={`mh-${wi}`}
                    title={colTitle}
                    className={`flex ${COL_WIDTH_CLASS} shrink-0 flex-col items-center justify-end`}
                  >
                    <span className="max-w-full truncate text-center text-[8px] leading-none text-zinc-400">
                      {label || "\u00a0"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex w-max gap-1">
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="flex flex-col gap-1"
                  title={weekColumnTitle(week.weekStartMonday)}
                >
                  {week.cells.map((cell, di) => {
                    if (!cell) {
                      return (
                        <div
                          key={`e-${wi}-${di}`}
                          title="Outside task history range"
                          className="size-2.5 shrink-0 rounded-sm bg-transparent"
                          aria-hidden
                        />
                      );
                    }
                    const key = dateKeyLocal(cell);
                    const status = cellStatus(
                      key,
                      logCompletedByDate,
                      restMap,
                      heatmapApplicableKeys,
                    );
                    const bg =
                      status === "done"
                        ? accent.done
                        : status === "rest"
                          ? accent.rest
                          : status === "missed"
                            ? accent.missed
                            : status === "out_of_scope"
                              ? accent.outOfScope
                              : accent.dim;
                    const ring =
                      status === "done"
                        ? `0 0 0 1px ${accent.done}35`
                        : status === "rest"
                          ? `0 0 0 1px ${accent.rest}45`
                          : status === "missed"
                            ? `0 0 0 1px rgba(251, 146, 60, 0.3)`
                            : status === "out_of_scope"
                              ? `inset 0 0 0 1px rgba(255,255,255,0.04)`
                              : `inset 0 0 0 1px rgba(255,255,255,0.05)`;
                    return (
                      <div
                        key={key}
                        role="img"
                        aria-label={dayCellHoverTitleFromStatus(cell, status)}
                        title={dayCellHoverTitleFromStatus(cell, status)}
                        className="size-2.5 shrink-0 rounded-sm transition-colors"
                        style={{
                          backgroundColor: bg,
                          boxShadow: ring,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}
