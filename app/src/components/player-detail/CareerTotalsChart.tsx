import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLegend, niceAxis } from "@/components/charts";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { SegmentedControl } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeason, formatToi } from "@/lib/formatters";
import { CHART_AXIS_COLOURS, CHART_COLOURS } from "@/lib/chart-colours";
import { cn } from "@/lib/utils";
import type { SkaterStats } from "@/types";

const MIN_GAMES_FOR_FULL_SEASON = 20;

type ViewMode = "totals" | "perGame" | "toi";

interface SeasonData {
  seasonLabel: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  toiSeconds: number;
  toiPerGame: number;
}

const VIEWS: { value: ViewMode; label: string; description: string }[] = [
  { value: "totals", label: "Totals", description: "Goals and assists per season, stacked to points" },
  { value: "perGame", label: "Per game", description: "Goals and assists per game played, stacked to points per game" },
  { value: "toi", label: "Ice time", description: "Average time on ice per game" },
];

const GOALS_COLOUR = CHART_COLOURS[0];
// Parts of one total, so one hue: assists are a lighter shade of goals.
const ASSISTS_COLOUR = `color-mix(in oklab, ${CHART_COLOURS[0]} 40%, var(--card))`;

const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** Season-by-season scoring and ice time over a skater's career. */
export function CareerTotalsChart({ stats, className }: { stats: SkaterStats[]; className?: string }) {
  const [view, setView] = useState<ViewMode>("totals");

  const chartData = useMemo(() => {
    const seasonMap = new Map<number, { gamesPlayed: number; goals: number; assists: number; toiSeconds: number }>();
    for (const stat of stats) {
      if (stat.isPlayoffs || stat.situation !== "all") continue;
      const s = seasonMap.get(stat.season) ?? { gamesPlayed: 0, goals: 0, assists: 0, toiSeconds: 0 };
      s.gamesPlayed += stat.gamesPlayed;
      s.goals += stat.goals;
      s.assists += stat.assists;
      s.toiSeconds += stat.iceTimeSeconds;
      seasonMap.set(stat.season, s);
    }

    const data: SeasonData[] = [];
    for (const season of [...seasonMap.keys()].sort((a, b) => a - b)) {
      const s = seasonMap.get(season)!;
      // A part season (or the one in progress) would read as a collapse in totals.
      if (s.gamesPlayed < MIN_GAMES_FOR_FULL_SEASON) continue;
      data.push({
        seasonLabel: formatSeason(season),
        gamesPlayed: s.gamesPlayed,
        goals: s.goals,
        assists: s.assists,
        points: s.goals + s.assists,
        toiSeconds: s.toiSeconds,
        toiPerGame: s.toiSeconds / s.gamesPlayed / 60,
      });
    }
    return data;
  }, [stats]);

  if (chartData.length < 2) return null;

  const selectedView = VIEWS.find((v) => v.value === view)!;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Career stats</CardTitle>
        <SegmentedControl
          aria-label="Career stats view"
          value={view}
          onValueChange={setView}
          options={VIEWS}
        />
      </CardHeader>
      <CardContent>
        {view !== "toi" && (
          <ChartLegend
            className="mb-2"
            items={[
              { label: "Goals", colour: GOALS_COLOUR },
              { label: "Assists", colour: ASSISTS_COLOUR },
            ]}
          />
        )}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {view === "toi" ? (
              <TOIChart data={chartData} />
            ) : (
              <ScoringChart data={chartData} perGame={view === "perGame"} />
            )}
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedView.description}. Regular season only; seasons with fewer than {MIN_GAMES_FOR_FULL_SEASON} games are not shown.
        </p>
      </CardContent>
    </Card>
  );
}

const axisProps = {
  tick: { fill: CHART_AXIS_COLOURS.tick, fontSize: 12 },
  stroke: CHART_AXIS_COLOURS.grid,
  strokeOpacity: CHART_AXIS_COLOURS.gridOpacity,
};

function ScoringChart({ data, perGame }: { data: SeasonData[]; perGame: boolean }) {
  const rows = data.map((d) => ({
    ...d,
    g: perGame ? d.goals / d.gamesPlayed : d.goals,
    a: perGame ? d.assists / d.gamesPlayed : d.assists,
  }));
  const axis = niceAxis(
    rows.map((r) => r.g + r.a),
    { includeZero: true },
  );
  return (
    <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} strokeOpacity={CHART_AXIS_COLOURS.gridOpacity} vertical={false} />
      <XAxis dataKey="seasonLabel" {...axisProps} />
      <YAxis
        {...axisProps}
        width={40}
        domain={axis.domain}
        ticks={axis.ticks}
        tickFormatter={(v: number) => (perGame ? v.toFixed(1) : String(v))}
      />
      <Tooltip
        cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
        content={<ScoringTooltip perGame={perGame} />}
      />
      <Bar dataKey="g" name="Goals" stackId="p" fill={GOALS_COLOUR} maxBarSize={48} />
      <Bar dataKey="a" name="Assists" stackId="p" fill={ASSISTS_COLOUR} radius={[4, 4, 0, 0]} maxBarSize={48} />
    </BarChart>
  );
}

function TOIChart({ data }: { data: SeasonData[] }) {
  const axis = niceAxis(data.map((d) => d.toiPerGame), { pad: 1 });
  return (
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} strokeOpacity={CHART_AXIS_COLOURS.gridOpacity} vertical={false} />
      <XAxis dataKey="seasonLabel" {...axisProps} />
      <YAxis
        {...axisProps}
        width={40}
        domain={axis.domain}
        ticks={axis.ticks}
        tickFormatter={(v: number) => `${Math.round(v)}m`}
      />
      <Tooltip cursor={{ stroke: CHART_AXIS_COLOURS.grid }} content={<TOITooltip />} />
      <Line
        type="linear"
        dataKey="toiPerGame"
        name="TOI/GP"
        stroke={CHART_COLOURS[0]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[0], r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  );
}

function TooltipRow({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {colour && <span className="size-2.5 rounded-[3px]" style={{ background: colour }} />}
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function ScoringTooltip({
  active,
  payload,
  perGame,
}: {
  active?: boolean;
  payload?: Array<{ payload: SeasonData }>;
  perGame: boolean;
}) {
  if (isCoarsePointer() || !active || !payload?.length) return null;
  const d = payload[0].payload;
  const fmt = (v: number) => (perGame ? (v / d.gamesPlayed).toFixed(2) : String(v));
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle>{d.seasonLabel}</TooltipTitle>
      <p className="mb-2 text-xs text-muted-foreground">{d.gamesPlayed} GP</p>
      <div className="space-y-1 text-xs">
        <TooltipRow label={perGame ? "G/GP" : "Goals"} value={fmt(d.goals)} colour={GOALS_COLOUR} />
        <TooltipRow label={perGame ? "A/GP" : "Assists"} value={fmt(d.assists)} colour={ASSISTS_COLOUR} />
        <div className="border-t pt-1">
          <TooltipRow label={perGame ? "P/GP" : "Points"} value={fmt(d.points)} />
        </div>
      </div>
    </div>
  );
}

function TOITooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SeasonData }> }) {
  if (isCoarsePointer() || !active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle colour={CHART_COLOURS[0]}>{d.seasonLabel}</TooltipTitle>
      <div className="space-y-1 text-xs">
        <TooltipRow label="TOI/GP" value={formatToi(d.toiSeconds / d.gamesPlayed)} />
        <TooltipRow label="Total" value={`${Math.round(d.toiSeconds / 60).toLocaleString()} min`} />
        <TooltipRow label="GP" value={String(d.gamesPlayed)} />
      </div>
    </div>
  );
}
