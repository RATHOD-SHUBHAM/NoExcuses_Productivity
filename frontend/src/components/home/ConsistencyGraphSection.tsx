import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { glassCard } from "../../lib/ui";

export type ChartPoint = {
  label: string;
  completed: number;
  restMarks: number;
  globalRest?: boolean;
};

/** One row per day for Recharts, including the synthetic pulse value. */
export type HeartbeatRow = ChartPoint & {
  pulse: number;
  activityScore: number;
};

const PULSE_MIN = 10;
const PULSE_MAX = 90;
const PULSE_START = 50;
const STEP_UP = 16;
const STEP_DOWN = 14;

/** Classic rhythm line — rose accent (matches app theme). */
const LINE_STROKE = "#fb7185";
const LINE_ACTIVE = "#fda4af";

/**
 * “Heartbeat” line: climbs on any meaningful day (done, per-task rest, or
 * whole-day rest) and steps down on empty days — so global rest still moves
 * the line up like progress.
 */
function buildHeartbeatData(
  rows: ChartPoint[],
  taskCount: number,
): HeartbeatRow[] {
  let v = PULSE_START;
  const nTasks = Math.max(1, taskCount);
  return rows.map((row) => {
    const globalBump = row.globalRest ? nTasks : 0;
    const activityScore = row.completed + row.restMarks + globalBump;
    if (activityScore > 0) {
      v = Math.min(v + STEP_UP, PULSE_MAX);
    } else {
      v = Math.max(v - STEP_DOWN, PULSE_MIN);
    }
    return { ...row, pulse: Math.round(v), activityScore };
  });
}

type Props = {
  data: ChartPoint[];
  loading?: boolean;
  error?: string | null;
  subtitle?: string;
  taskCount?: number;
  sectionTitle?: string;
  footerNote?: string;
  sectionHeadingId?: string;
};

export function ConsistencyGraphSection({
  data,
  loading,
  error,
  subtitle,
  taskCount = 1,
  sectionTitle = "Rhythm · heartbeat (this month)",
  footerNote,
  sectionHeadingId = "graph-heading",
}: Props) {
  const pulseData = useMemo(
    () => buildHeartbeatData(data, taskCount),
    [data, taskCount],
  );

  return (
    <section aria-labelledby={sectionHeadingId}>
      <h4
        id={sectionHeadingId}
        className="mb-1.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:text-left sm:text-sm"
      >
        {sectionTitle}
      </h4>
      {subtitle && (
        <p className="mb-3 text-center text-sm text-zinc-500 sm:text-left">
          {subtitle}
        </p>
      )}
      {loading ? (
        <div
          className={`${glassCard} flex min-h-[220px] items-center justify-center py-12 text-sm text-zinc-400 sm:h-64 sm:min-h-0 sm:py-0`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-600 border-t-rose-400"
              aria-hidden
            />
            Loading chart…
          </span>
        </div>
      ) : error ? (
        <div
          role="alert"
          className={`${glassCard} flex min-h-[220px] flex-col items-center justify-center gap-2 border-red-500/25 bg-red-950/25 px-4 py-8 text-center text-sm text-red-200/95 sm:h-64 sm:min-h-0`}
        >
          <span className="font-medium text-red-100">Something went wrong</span>
          <span className="max-w-sm text-sm text-red-300/75">{error}</span>
        </div>
      ) : (
        <div
          className={`${glassCard} h-[min(16rem,55vw)] w-full px-1 py-3 sm:h-64 sm:px-2 sm:py-4`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={pulseData}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#3f3f46" }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                allowDecimals={false}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#3f3f46" }}
                width={32}
              />
              <Tooltip
                cursor={{
                  stroke: "#52525b",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={({ active, label }) => {
                  if (!active || label == null) return null;
                  const row = pulseData.find((r) => r.label === label);
                  if (!row) return null;
                  return (
                    <div className="rounded-xl border border-zinc-600 bg-zinc-900/95 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
                      <p className="mb-1.5 font-medium text-zinc-300">
                        Day {row.label}
                      </p>
                      <p className="font-semibold text-rose-200/95">
                        Pulse: {row.pulse}
                      </p>
                      <p className="mt-1 text-zinc-400">
                        Activity score: {row.activityScore}{" "}
                        <span className="text-zinc-500">
                          (drives up ↗ or down ↘)
                        </span>
                      </p>
                      <p className="mt-1.5 text-emerald-300/95">
                        Completed: {row.completed}
                      </p>
                      <p className="text-amber-300/95">
                        Rest marks (habits): {row.restMarks}
                      </p>
                      {row.globalRest ? (
                        <p className="mt-1 text-violet-300/95">
                          Whole-day rest — counts toward rhythm
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Line
                type="linear"
                name="Rhythm"
                dataKey="pulse"
                stroke={LINE_STROKE}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: LINE_ACTIVE,
                  stroke: "#fff",
                  strokeWidth: 1,
                }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && !error && (
        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-500 sm:text-left">
          {footerNote ?? (
            <>
              Steps up when you complete habits or log rest days in the planner;
              drifts down on quiet days. Rest is included in these charts.
            </>
          )}
        </p>
      )}
    </section>
  );
}
