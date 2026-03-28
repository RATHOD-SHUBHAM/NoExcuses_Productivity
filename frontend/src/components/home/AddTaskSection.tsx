import { type FormEvent, useState } from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { glassCard, inputBase } from "../../lib/ui";

type Props = {
  onAdd: (title: string) => void | Promise<void>;
  disabled?: boolean;
};

export function AddTaskSection({ onAdd, disabled }: Props) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    await onAdd(trimmed);
    setValue("");
  }

  return (
    <section aria-labelledby="add-task-heading" className={glassCard}>
      <SectionHeading id="add-task-heading">Add task</SectionHeading>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <label htmlFor="task-input" className="sr-only">
          Task name
        </label>
        <input
          id="task-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What are you committing to today?"
          autoComplete="off"
          disabled={disabled}
          className={`min-h-12 flex-1 px-4 py-3 sm:min-h-11 ${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={disabled}
          className="min-h-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-8 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(52,211,153,0.55)] transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-6"
        >
          Add
        </button>
      </form>
    </section>
  );
}
