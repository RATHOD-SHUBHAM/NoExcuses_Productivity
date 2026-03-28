import { Link } from "react-router-dom";
import { glassCard } from "../../lib/ui";
import type { Task } from "../../types/task";
import { SectionHeading } from "../ui/SectionHeading";

type Props = {
  tasks: Task[];
  loading?: boolean;
  onToggleComplete: (id: string) => void | Promise<void>;
  onToggleRestToday: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

export function TaskListSection({
  tasks,
  loading,
  onToggleComplete,
  onToggleRestToday,
  onDelete,
}: Props) {
  return (
    <section aria-labelledby="tasks-heading">
      <SectionHeading id="tasks-heading">Tasks</SectionHeading>
      {loading ? (
        <p
          className={`${glassCard} py-10 text-center text-sm text-zinc-400`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-600 border-t-rose-400"
              aria-hidden
            />
            Loading tasks…
          </span>
        </p>
      ) : tasks.length === 0 ? (
        <p
          className={`${glassCard} border-dashed border-white/15 py-10 text-center text-sm text-zinc-400`}
        >
          No tasks yet. Add one below — stay focused.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 sm:gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`${glassCard} flex flex-col gap-3 py-3 !shadow-lg transition hover:border-white/12 hover:shadow-xl sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 sm:py-2.5`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                <input
                  type="checkbox"
                  checked={task.completedToday}
                  onChange={() => {
                    void onToggleComplete(task.id);
                  }}
                  disabled={loading}
                  aria-label={`${task.completedToday ? "Uncheck" : "Mark"} "${task.title}" for today`}
                  className="mt-0.5 size-5 shrink-0 rounded border-zinc-500 bg-zinc-950 text-emerald-500 focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:size-4"
                />
                <Link
                  to={`/tasks/${task.id}`}
                  className="min-w-0 flex-1 text-left text-sm font-medium leading-snug text-white transition hover:text-rose-200 sm:truncate"
                >
                  {task.title}
                </Link>
              </div>
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs font-medium text-amber-100/90 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 sm:min-h-0 sm:py-1.5">
                  <input
                    type="checkbox"
                    checked={task.restToday}
                    onChange={() => {
                      void onToggleRestToday(task.id);
                    }}
                    disabled={loading}
                    aria-label={`${task.restToday ? "Remove" : "Mark"} rest day for "${task.title}" (this habit only)`}
                    className="size-4 shrink-0 rounded border-amber-600/60 bg-zinc-950 text-amber-500 focus:ring-2 focus:ring-amber-500/35 focus:ring-offset-0"
                  />
                  <span className="select-none">Rest today</span>
                </label>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="min-h-10 shrink-0 self-start rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-950/60 sm:min-h-0 sm:self-auto sm:border-transparent sm:bg-transparent sm:px-2.5 sm:py-1.5 sm:hover:bg-red-950/50"
                  aria-label={`Delete ${task.title}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
