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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError(null);
      setLoading(true);
      const today = todayLocalISO();
      const weekFrom = addDaysLocalISO(today, -6);
      const monthStart = firstDayOfMonthLocalISO();
      const slots = Math.max(1, slotsPerDay);
      try {
        const [weekRows, monthRows] = await Promise.all([
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
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load summary");
          setWeek(null);
          setMonth(null);
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
          ? "Check-ins logged vs possible (your tasks × days). Rest isn’t a check-in."
          : "Share of habit check-ins logged vs what was possible (tasks you have this month × calendar days). Rest doesn’t count as a check-in."}
      </p>
      {error ? (
        <p className="text-sm text-red-300/90">{error}</p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : week && month ? (
        <div className={`grid sm:grid-cols-2 ${compact ? "gap-4" : "gap-6"}`}>
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
