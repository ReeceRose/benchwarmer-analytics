import { Skeleton } from "@/components/ui/skeleton";
import { useScoreStateStats } from "@/hooks";
import { cn } from "@/lib/utils";
import type { ScoreStateBreakdown } from "@/types";
import { EmptyState, Panel, Section } from "@/components/layout";

interface ScoreStateDashboardProps {
  abbrev: string;
  season?: number;
}

const STATES = [
  { key: "leading", label: "When leading" },
  { key: "trailing", label: "When trailing" },
  { key: "tied", label: "When tied" },
] as const;

const DESCRIPTION =
  "How the team plays when leading, trailing or tied, using the score at the time of each shot.";

export function ScoreStateDashboard({ abbrev, season }: ScoreStateDashboardProps) {
  const currentSeason = season ?? new Date().getFullYear();
  const { data, isLoading, error } = useScoreStateStats(abbrev, currentSeason, false);

  if (isLoading) {
    return <ScoreStateDashboardSkeleton />;
  }

  if (error || !data) {
    return <EmptyState title="No score state stats for this season yet" />;
  }

  return (
    <div className="space-y-8">
      <Section title="Score state" description={DESCRIPTION}>
        <div className="grid gap-4 md:grid-cols-3">
          {STATES.map(({ key, label }) => (
            <ScoreStateCard key={key} label={label} breakdown={data[key]} total={data.total} />
          ))}
        </div>
      </Section>

      <Section title="Breakdown">
        <ScoreStateTable data={data} />
      </Section>
    </div>
  );
}

// Format seconds as H:MM:SS or M:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPct(value: number | null | undefined): string {
  return value != null ? `${value.toFixed(1)}%` : "–";
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function diffClass(value: number): string | undefined {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return undefined;
}

function ScoreStateCard({
  label,
  breakdown,
  total,
}: {
  label: string;
  breakdown: ScoreStateBreakdown;
  total: ScoreStateBreakdown;
}) {
  const hasData =
    breakdown.shotsFor > 0 ||
    breakdown.shotsAgainst > 0 ||
    breakdown.goalsFor > 0 ||
    breakdown.goalsAgainst > 0;

  const share = (part: number, whole: number) =>
    whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%";
  const timeShare =
    total.timeSeconds && breakdown.timeSeconds
      ? share(breakdown.timeSeconds, total.timeSeconds)
      : null;

  return (
    <Panel className="flex flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        {breakdown.timeSeconds != null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(breakdown.timeSeconds)}
            {timeShare && ` · ${timeShare} of time`}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
          No time spent in this state
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <dd className="font-display text-3xl font-bold tabular-nums">{breakdown.goalsFor}</dd>
              <dt className="text-xs text-muted-foreground">Goals for</dt>
            </div>
            <div>
              <dd className="font-display text-3xl font-bold tabular-nums">{breakdown.goalsAgainst}</dd>
              <dt className="text-xs text-muted-foreground">Goals against</dt>
            </div>
          </dl>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">xG differential</dt>
              <dd className={cn("font-medium tabular-nums", diffClass(breakdown.xgDifferential))}>
                {signed(breakdown.xgDifferential)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shooting %</dt>
              <dd className="font-medium tabular-nums">{formatPct(breakdown.shootingPct)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Save %</dt>
              <dd className="font-medium tabular-nums">{formatPct(breakdown.savePct)}</dd>
            </div>
          </dl>

          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground tabular-nums">
            {share(breakdown.shotsFor, total.shotsFor)} of the team's shots,{" "}
            {share(breakdown.goalsFor, total.goalsFor)} of its goals
          </p>
        </>
      )}
    </Panel>
  );
}

interface ScoreStateTableProps {
  data: {
    leading: ScoreStateBreakdown;
    trailing: ScoreStateBreakdown;
    tied: ScoreStateBreakdown;
    total: ScoreStateBreakdown;
  };
}

const COLUMNS = ["Time", "SF", "SA", "GF", "GA", "xGF", "xGA", "xG±", "Sh%", "Sv%"];

function ScoreStateTable({ data }: ScoreStateTableProps) {
  const rows = [
    { label: "Leading", ...data.leading, isTotal: false },
    { label: "Trailing", ...data.trailing, isTotal: false },
    { label: "Tied", ...data.tied, isTotal: false },
    { label: "Total", ...data.total, isTotal: true },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-card py-3 pr-4 pl-5 text-left">State</th>
            {COLUMNS.map((c, i) => (
              <th
                key={c}
                className={cn("px-3 py-3 text-right", i === COLUMNS.length - 1 && "pr-5")}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={cn("border-b last:border-0", row.isTotal && "border-t font-semibold")}
            >
              <td className="sticky left-0 z-10 bg-card py-2.5 pr-4 pl-5 whitespace-nowrap">{row.label}</td>
              <td className="px-3 text-right">
                {row.timeSeconds != null ? formatTime(row.timeSeconds) : "–"}
              </td>
              <td className="px-3 text-right">{row.shotsFor}</td>
              <td className="px-3 text-right">{row.shotsAgainst}</td>
              <td className="px-3 text-right">{row.goalsFor}</td>
              <td className="px-3 text-right">{row.goalsAgainst}</td>
              <td className="px-3 text-right">{row.xGoalsFor.toFixed(1)}</td>
              <td className="px-3 text-right">{row.xGoalsAgainst.toFixed(1)}</td>
              <td className={cn("px-3 text-right", diffClass(row.xgDifferential))}>
                {signed(row.xgDifferential)}
              </td>
              <td className="px-3 text-right">{formatPct(row.shootingPct)}</td>
              <td className="px-3 pr-5 text-right">{formatPct(row.savePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreStateDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
