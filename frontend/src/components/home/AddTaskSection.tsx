import { type FormEvent, useState } from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { glassCard, glassCardSubtle, inputBase } from "../../lib/ui";

type Props = {
  onAdd: (title: string) => void | Promise<void>;
  disabled?: boolean;
  sectionHeadingId: string;
  sectionTitle: string;
  inputPlaceholder: string;
  submitLabel?: string;
  sectionDescription?: string;
  /** Lighter card — for the home dashboard add row. */
  compact?: boolean;
};

export function AddTaskSection({
  onAdd,
  disabled,
  sectionHeadingId,
  sectionTitle,
  inputPlaceholder,
  submitLabel = "Add",
  sectionDescription,
  compact = false,
}: Props) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    await onAdd(trimmed);
    setValue("");
  }

  const inputId = `${sectionHeadingId}-input`;

  if (compact) {
    return (
      <section
        aria-labelledby={sectionHeadingId}
        className={`${glassCardSubtle} p-3 sm:p-4`}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
        >
          <div className="min-w-0 flex-1">
            <label
              id={sectionHeadingId}
              htmlFor={inputId}
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
            >
              {sectionTitle}
            </label>
            {sectionDescription ? (
              <p className="mb-2 text-xs leading-snug text-zinc-600">
                {sectionDescription}
              </p>
            ) : null}
            <input
              id={inputId}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              autoComplete="off"
              disabled={disabled}
              className={`min-h-10 w-full px-3 py-2.5 text-sm ${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="min-h-10 shrink-0 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 px-5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)] transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-end"
          >
            {submitLabel}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section aria-labelledby={sectionHeadingId} className={glassCard}>
      <SectionHeading id={sectionHeadingId}>{sectionTitle}</SectionHeading>
      {sectionDescription ? (
        <p className="mt-2 max-w-xl text-pretty text-xs leading-relaxed text-zinc-600">
          {sectionDescription}
        </p>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <label htmlFor={inputId} className="sr-only">
          {sectionTitle}
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={inputPlaceholder}
          autoComplete="off"
          disabled={disabled}
          className={`min-h-12 flex-1 px-4 py-3 sm:min-h-11 ${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={disabled}
          className="min-h-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-8 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(52,211,153,0.55)] transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-6"
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
