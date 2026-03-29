import { useTimeFormat } from "../../context/TimeFormatContext";

/** Switch between 12-hour (AM/PM) and 24-hour display for planned time windows. */
export function TimeFormatToggle() {
  const { timeFormat, setTimeFormat } = useTimeFormat();

  return (
    <div
      className="flex max-w-full shrink-0 flex-wrap items-center gap-1.5 sm:gap-2"
      title="How planned habit times are shown and edited (saved as 24h in the database)"
    >
      <span
        id="time-format-label"
        className="whitespace-nowrap text-xs font-medium text-zinc-500 sm:text-sm"
      >
        Time format
      </span>
      <div
        className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-zinc-950/50 p-0.5"
        role="group"
        aria-labelledby="time-format-label"
      >
        <button
          type="button"
          onClick={() => setTimeFormat("12")}
          className={[
            "rounded-md px-2 py-1 text-xs font-medium transition sm:px-2.5 sm:text-sm",
            timeFormat === "12"
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          12h
        </button>
        <button
          type="button"
          onClick={() => setTimeFormat("24")}
          className={[
            "rounded-md px-2 py-1 text-xs font-medium transition sm:px-2.5 sm:text-sm",
            timeFormat === "24"
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          24h
        </button>
      </div>
    </div>
  );
}
