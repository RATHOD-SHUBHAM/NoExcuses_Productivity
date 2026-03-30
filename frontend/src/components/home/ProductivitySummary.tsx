import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import * as tasksApi from "../../api/tasksApi";
import {
  addDaysLocalISO,
  firstDayOfMonthLocalISO,
  todayLocalISO,
} from "../../lib/date";
import { glassCard, homeFeaturePanel, homePanelPad } from "../../lib/ui";
import { SectionHeading } from "../ui/SectionHeading";

const ROSE = "#fb7185";
const TRACK = "#27272a";

type Props = {
  slotsPerDay: number;
  refreshKey: string;
  /** Shorter copy and spacing for dense dashboards. */
  compact?: boolean;
};

function donutData(done: number, possible: number) {
  const open = Math.max(0, possible - done);
  return [
    { name: "done", value: done },
    { name: "open", value: open },
  ];
}

export function ProductivitySummary({
  slotsPerDay,
  refreshKey,
  compact = false,
}: Props) {
  const [week, setWeek] = useState<{
    pct: number;
    done: number;
    possible: number;
  } | null>(null);
  const [month, setMonth] = useState<{
    pct: number;
    done: number;
    possible: number;
  } | null>(null);
  /** Same semantics as Check-in “Yesterday” (GET /api/stats/day-checkin). */
  const [yesterday, setYesterday] = useState<{
    pct: number;
    done: number;
    possible: number;
  } | null>(null);
  const [yesterdayNote, setYesterdayNote] = useState<
    "rest" | "empty" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError(null);
      setLoading(true);
      const today = todayLocalISO();
      const ymdYesterday = addDaysLocalISO(today, -1);
      const weekFrom = addDaysLocalISO(today, -6);
      const monthStart = firstDayOfMonthLocalISO();
      const slots = Math.max(1, slotsPerDay);
      try {
        const [weekRows, monthRows, dayRow] = await Promise.all([
          tasksApi.getMonthlyCompletions({
            from: weekFrom,
            to: today,
            taskKind: "all",
          }),
          tasksApi.getMonthlyCompletions({
            from: monthStart,
            to: today,
            taskKind: "all",
          }),
          tasksApi.getDayCheckinSummary(ymdYesterday),
        ]);
        if (cancelled) return;

        const weekDone = weekRows.reduce((s, r) => s + r.count, 0);
        const weekDays = Math.max(1, weekRows.length);
        const weekPossible = slots * weekDays;
        const wPct = Math.min(100, Math.round((weekDone / weekPossible) * 100));

        const monthDone = monthRows.reduce((s, r) => s + r.count, 0);
        const monthDays = Math.max(1, monthRows.length);
        const monthPossible = slots * monthDays;
        const mPct = Math.min(100, Math.round((monthDone / monthPossible) * 100));

        setWeek({ pct: wPct, done: weekDone, possible: weekPossible });
        setMonth({ pct: mPct, done: monthDone, possible: monthPossible });

        if (dayRow.global_rest) {
          setYesterday(null);
          setYesterdayNote("rest");
        } else {
          const exp =
            dayRow.daily.expected + dayRow.monthly.expected;
          const comp =
            dayRow.daily.completed + dayRow.monthly.completed;
          if (exp <= 0) {
            setYesterday(null);
            setYesterdayNote("empty");
          } else {
            setYesterday({
              pct: Math.min(100, Math.round((comp / exp) * 100)),
              done: comp,
              possible: exp,
            });
            setYesterdayNote(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load summary");
          setWeek(null);
          setMonth(null);
          setYesterday(null);
          setYesterdayNote(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [slotsPerDay, refreshKey]);

  return (
    <section
      className={`${homeFeaturePanel} ${homePanelPad} ${compact ? "space-y-3" : "space-y-4"}`}
      aria-labelledby="productivity-summary-heading"
    >
      <SectionHeading id="productivity-summary-heading">Snapshot</SectionHeading>
      <p
        className={
          compact
            ? "-mt-1 max-w-xl text-sm leading-snug text-zinc-500"
            : "-mt-1 max-w-xl text-base leading-relaxed text-zinc-500"
        }
      >
        {compact
          ? "Last 7 days & month: check-ins vs possible (tasks × days). Yesterday: one-day score (same as the Check-in card). Rest never counts as a check-in."
          : "Last 7 days and month-to-date show total check-ins vs how many were possible across those days. Yesterday is a single-day score—done vs items on your list that day (aligned with the Yesterday summary above). Rest doesn’t count as a check-in."}
      </p>
      {error ? (
        <p className="text-sm text-red-300/90">{error}</p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : week && month ? (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${compact ? "gap-4" : "gap-6"}`}
        >
          <YesterdayDonut
            pct={yesterday?.pct ?? 0}
            done={yesterday?.done ?? 0}
            possible={yesterday?.possible ?? 0}
            note={yesterdayNote}
          />
          <MiniDonut
            title="Last 7 days"
            pct={week.pct}
            data={donutData(week.done, week.possible)}
            subtitle={`${week.done} / ${week.possible} check-ins`}
          />
          <MiniDonut
            title="Month to date"
            pct={month.pct}
            data={donutData(month.done, month.possible)}
            subtitle={`${month.done} / ${month.possible} check-ins`}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Single-day productivity (same API as Check-in → Yesterday). */
function YesterdayDonut({
  pct,
  done,
  possible,
  note,
}: {
  pct: number;
  done: number;
  possible: number;
  note: "rest" | "empty" | null;
}) {
  if (note === "rest") {
    return (
      <div className={`${glassCard} !p-4`}>
        <p className="mb-1 text-center text-base font-medium text-zinc-400">
          Yesterday
        </p>
        <div className="relative mx-auto flex h-40 max-w-[200px] flex-col items-center justify-center rounded-xl border border-violet-500/20 bg-violet-950/25 px-3">
          <p className="text-center text-sm font-medium text-violet-200/95">
            Rest day
          </p>
          <p className="mt-1 text-center text-xs text-zinc-500">
            No checklist counted
          </p>
        </div>
        <p className="mt-2 text-center text-base text-zinc-500">—</p>
      </div>
    );
  }
  if (note === "empty") {
    return (
      <div className={`${glassCard} !p-4`}>
        <p className="mb-1 text-center text-base font-medium text-zinc-400">
          Yesterday
        </p>
        <div className="relative mx-auto flex h-40 max-w-[200px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-zinc-950/40 px-3">
          <p className="text-center text-sm text-zinc-500">
            Nothing on your list
          </p>
        </div>
        <p className="mt-2 text-center text-base text-zinc-500">—</p>
      </div>
    );
  }
  return (
    <MiniDonut
      title="Yesterday"
      pct={pct}
      data={donutData(done, possible)}
      subtitle={`${done} / ${possible} items`}
    />
  );
}

function MiniDonut({
  title,
  pct,
  data,
  subtitle,
}: {
  title: string;
  pct: number;
  data: { name: string; value: number }[];
  subtitle: string;
}) {
  return (
    <div className={`${glassCard} !p-4`}>
      <p className="mb-1 text-center text-base font-medium text-zinc-400">
        {title}
      </p>
      <div className="relative mx-auto h-40 w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={ROSE} />
              <Cell fill={TRACK} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-medium text-white tabular-nums">
            {pct}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-center text-base text-zinc-500">{subtitle}</p>
    </div>
  );
}
