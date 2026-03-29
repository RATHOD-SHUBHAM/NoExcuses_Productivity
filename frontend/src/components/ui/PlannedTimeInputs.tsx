import { useTimeFormat } from "../../context/TimeFormatContext";
import { from12Parts, hhMmTo12Parts } from "../../lib/timeFormat";
import { inputBase } from "../../lib/ui";

const MIN_OPTS = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

type Props = {
  startValue: string;
  endValue: string;
  onStartChange: (hhmm: string) => void;
  onEndChange: (hhmm: string) => void;
  disabled?: boolean;
  startId: string;
  endId: string;
};

function TwelveHourField({
  value,
  onChange,
  id,
  disabled,
  label,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  id: string;
  disabled?: boolean;
  label: string;
}) {
  const parts = value.trim() ? hhMmTo12Parts(value) : null;
  const empty = !parts;

  const setFromParts = (
    h12: number | null,
    minute: number | null,
    ampm: "AM" | "PM" | null,
  ) => {
    if (h12 === null || minute === null || ampm === null) {
      onChange("");
      return;
    }
    onChange(from12Parts(h12, minute, ampm));
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="group"
      aria-label={label}
    >
      <label htmlFor={`${id}-h`} className="sr-only">
        {label} hour
      </label>
      <select
        id={`${id}-h`}
        disabled={disabled}
        value={empty ? "" : String(parts!.h12)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange("");
            return;
          }
          const h12 = Number(v);
          const m = parts?.minute ?? 0;
          const ap = parts?.ampm ?? "AM";
          onChange(from12Parts(h12, m, ap));
        }}
        className={`min-h-10 rounded-lg px-2 py-2 text-sm ${inputBase} disabled:opacity-50`}
      >
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-zinc-500" aria-hidden>
        :
      </span>
      <label htmlFor={`${id}-m`} className="sr-only">
        {label} minutes
      </label>
      <select
        id={`${id}-m`}
        disabled={disabled || empty}
        value={empty ? "" : String(parts!.minute).padStart(2, "0")}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || empty) return;
          const minute = Number(v);
          setFromParts(parts!.h12, minute, parts!.ampm);
        }}
        className={`min-h-10 rounded-lg px-2 py-2 text-sm ${inputBase} disabled:opacity-50`}
      >
        {empty ? (
          <option value="">--</option>
        ) : (
          MIN_OPTS.map((mm) => (
            <option key={mm} value={mm}>
              {mm}
            </option>
          ))
        )}
      </select>
      <label htmlFor={`${id}-ap`} className="sr-only">
        {label} AM or PM
      </label>
      <select
        id={`${id}-ap`}
        disabled={disabled || empty}
        value={empty ? "" : parts!.ampm}
        onChange={(e) => {
          const v = e.target.value as "AM" | "PM";
          if (!v || empty) return;
          setFromParts(parts!.h12, parts!.minute, v);
        }}
        className={`min-h-10 rounded-lg px-2 py-2 text-sm ${inputBase} disabled:opacity-50`}
      >
        {empty ? (
          <option value="">--</option>
        ) : (
          <>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </>
        )}
      </select>
    </div>
  );
}

/**
 * Planned window times (optional). Stored and sent as 24h `HH:MM`; UI follows `TimeFormat` preference.
 */
export function PlannedTimeInputs({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  disabled,
  startId,
  endId,
}: Props) {
  const { timeFormat } = useTimeFormat();

  if (timeFormat === "24") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={startId} className="sr-only">
          Window start
        </label>
        <input
          id={startId}
          type="time"
          value={startValue}
          onChange={(e) => onStartChange(e.target.value)}
          disabled={disabled}
          className={`min-h-10 rounded-xl px-3 py-2 text-sm ${inputBase} disabled:opacity-50`}
        />
        <span className="text-zinc-600" aria-hidden>
          –
        </span>
        <label htmlFor={endId} className="sr-only">
          Window end
        </label>
        <input
          id={endId}
          type="time"
          value={endValue}
          onChange={(e) => onEndChange(e.target.value)}
          disabled={disabled}
          className={`min-h-10 rounded-xl px-3 py-2 text-sm ${inputBase} disabled:opacity-50`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <TwelveHourField
        id={`${startId}-12`}
        label="Window start"
        value={startValue}
        onChange={onStartChange}
        disabled={disabled}
      />
      <span className="hidden text-zinc-600 sm:inline" aria-hidden>
        –
      </span>
      <TwelveHourField
        id={`${endId}-12`}
        label="Window end"
        value={endValue}
        onChange={onEndChange}
        disabled={disabled}
      />
    </div>
  );
}
