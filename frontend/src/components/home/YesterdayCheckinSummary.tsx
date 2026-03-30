import { useEffect, useState } from "react";
import * as tasksApi from "../../api/tasksApi";
import type { ApiDayCheckinBucket, ApiDayCheckinSummary } from "../../api/types";
import { addDaysLocalISO, todayLocalISO } from "../../lib/date";
import { glassCard } from "../../lib/ui";

type Props = {
  refreshKey: string;
};

function formatDayLabel(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bucketHasActivity(b: ApiDayCheckinBucket): boolean {
  return b.expected > 0 || b.rested > 0;
}

function BucketPanel({
  title,
  b,
}: {
  title: string;
  b: ApiDayCheckinBucket;
}) {
  if (!bucketHasActivity(b)) {
    return (
      <div className="rounded-lg border border-white/[0.05] bg-zinc-950/35 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {title}
        </p>
        <p className="mt-1 text-xs text-zinc-600">Nothing scheduled</p>
      </div>
    );
  }

  const rows: { label: string; value: number; tone: "done" | "open" | "rest" }[] =
    [];
  if (b.completed > 0) {
    rows.push({ label: "Done", value: b.completed, tone: "done" });
  }
  if (b.incomplete > 0) {
    rows.push({ label: "Not done", value: b.incomplete, tone: "open" });
  }
  if (b.rested > 0) {
    rows.push({ label: "Rested", value: b.rested, tone: "rest" });
  }

  const toneClass = {
    done: "text-emerald-400/95",
    open: "text-amber-200/90",
    rest: "text-sky-400/85",
  } as const;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-950/50 px-3 py-2.5 shadow-sm shadow-black/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline justify-between gap-4 text-sm tabular-nums"
          >
            <span className="text-zinc-500">{row.label}</span>
            <span className={`min-w-[1.5rem] text-right font-medium ${toneClass[row.tone]}`}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YesterdayCheckinSummary({ refreshKey }: Props) {
  const yesterday = addDaysLocalISO(todayLocalISO(), -1);
  const [data, setData] = useState<ApiDayCheckinSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const row = await tasksApi.getDayCheckinSummary(yesterday);
        if (!cancelled) setData(row);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [yesterday, refreshKey]);

  const dateLabel = formatDayLabel(yesterday);
  const showEmpty =
    data &&
    !data.global_rest &&
    !bucketHasActivity(data.daily) &&
    !bucketHasActivity(data.monthly);

  return (
    <div className={`${glassCard} border-white/[0.06] px-3 py-3 sm:px-4`}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Yesterday
          </p>
          <p className="mt-0.5 text-base font-medium tracking-tight text-zinc-200">
            {dateLabel}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300/90">{error}</p>
      ) : loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      ) : data ? (
        <div className="mt-3">
          {data.global_rest ? (
            <p className="text-sm leading-relaxed text-zinc-400">
              Rest day — no checklist counted.
            </p>
          ) : showEmpty ? (
            <p className="text-sm text-zinc-500">Nothing on your list that day.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              <BucketPanel title="Daily" b={data.daily} />
              <BucketPanel title="Monthly" b={data.monthly} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
