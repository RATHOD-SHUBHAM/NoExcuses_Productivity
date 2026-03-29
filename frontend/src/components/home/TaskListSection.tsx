import { Link } from "react-router-dom";
import { useTimeFormat } from "../../context/TimeFormatContext";
import { formatTimeWindowLabel } from "../../lib/timeWindow";
import { glassCard } from "../../lib/ui";
import type { Task } from "../../types/task";

type Props = {
  tasks: Task[];
  loading?: boolean;
  onToggleComplete: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  sectionHeadingId: string;
  sectionTitle: string;
  sectionDescription?: string;
  emptyHint: string;
  showKindBadge?: boolean;
  /** When false, no per-day checkbox (e.g. monthly goals — log days on calendar / task page). */
  showCompleteCheckbox?: boolean;
};

export function TaskListSection({
  tasks,
  loading,
  onToggleComplete,
  onDelete,
  sectionHeadingId,
  sectionTitle,
  sectionDescription,
  emptyHint,
  showKindBadge = false,
  showCompleteCheckbox = true,
}: Props) {
  const { timeFormat } = useTimeFormat();

  return (
    <section aria-labelledby={sectionHeadingId}>
      <h3
        id={sectionHeadingId}
        className="mb-2 text-base font-semibold tracking-tight text-zinc-100"
      >
        {sectionTitle}
      </h3>
      {sectionDescription ? (
        <p className="mb-4 max-w-prose text-sm leading-relaxed text-zinc-500">
          {sectionDescription}
        </p>
      ) : null}
      {loading ? (
        <p
          className={`${glassCard} py-8 text-center text-sm text-zinc-400`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-600 border-t-rose-400"
              aria-hidden
            />
            Loading…
          </span>
        </p>
      ) : tasks.length === 0 ? (
        <p
          className={`${glassCard} border-dashed border-white/10 py-8 text-center text-sm text-zinc-500`}
        >
          {emptyHint}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`${glassCard} !p-0 !shadow-md transition hover:border-white/10 hover:!shadow-lg`}
            >
              <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5 sm:pl-3 sm:pr-2">
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  {showCompleteCheckbox ? (
                    <input
                      type="checkbox"
                      checked={task.completedToday}
                      onChange={() => {
                        void onToggleComplete(task.id);
                      }}
                      disabled={loading}
                      aria-label={`${task.completedToday ? "Uncheck" : "Mark"} "${task.title}" for today`}
                      className="mt-0.5 size-[1.125rem] shrink-0 rounded border-zinc-500 bg-zinc-950 text-emerald-500 focus:ring-2 focus:ring-emerald-500/35 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
                    />
                  ) : (
                    <span
                      className="mt-0.5 size-[1.125rem] shrink-0 rounded-full border border-rose-400/35 bg-rose-500/10 shadow-[0_0_12px_-4px_rgba(244,63,94,0.35)]"
                      aria-hidden
                      title="Monthly goal — log days on the calendar or task page"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="min-w-0 flex-1 text-base font-medium leading-snug text-white [overflow-wrap:anywhere] hover:text-rose-200/95"
                      >
                        {task.title}
                      </Link>
                      {showKindBadge ? (
                        <span
                          className={
                            task.taskKind === "monthly"
                              ? "shrink-0 rounded border border-rose-500/25 bg-rose-950/45 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-rose-100/90"
                              : "shrink-0 rounded border border-zinc-600/45 bg-zinc-800/55 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-300"
                          }
                        >
                          {task.taskKind === "monthly" ? "Month" : "Daily"}
                        </span>
                      ) : null}
                    </div>
                    {task.taskKind === "daily" &&
                    formatTimeWindowLabel(
                      task.windowStart,
                      task.windowEnd,
                      timeFormat,
                    ) ? (
                      <p className="mt-1 text-xs tabular-nums text-cyan-400/90">
                        {formatTimeWindowLabel(
                          task.windowStart,
                          task.windowEnd,
                          timeFormat,
                        )}
                      </p>
                    ) : null}
                    {!showCompleteCheckbox &&
                    task.taskKind === "monthly" &&
                    task.daysCompletedThisMonth != null &&
                    task.daysInMonth != null ? (
                      <p className="mt-1.5 text-sm leading-snug text-zinc-500">
                        <span className="font-medium text-zinc-400">
                          {task.daysCompletedThisMonth}
                        </span>
                        /{task.daysInMonth} days this month
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end sm:pl-1">
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="rounded-md px-2 py-1 text-sm font-medium text-zinc-500 transition hover:bg-red-950/40 hover:text-red-300"
                    aria-label={`Remove ${task.title}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
