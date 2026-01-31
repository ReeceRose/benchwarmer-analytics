import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeason, formatToi } from "@/lib/formatters";
import { CHART_COLOURS, CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import type { SkaterStats } from "@/types";

interface CareerTotalsChartProps {
  stats: SkaterStats[];
}

type ViewMode = "totals" | "perGame" | "toi";

interface SeasonData {
  season: number;
  seasonLabel: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  xg: number;
  toiSeconds: number;
  toiPerGame: number;
  goalsPerGame: number;
  assistsPerGame: number;
  pointsPerGame: number;
  shotsPerGame: number;
}

const VIEWS: { key: ViewMode; label: string; description: string }[] = [
  {
    key: "totals",
    label: "Season Totals",
    description: "Total goals, assists, and points per season",
  },
  {
    key: "perGame",
    label: "Per Game",
    description: "Goals, assists, and points per game played",
  },
  {
    key: "toi",
    label: "Ice Time",
    description: "Average time on ice per game (minutes)",
  },
];

export function CareerTotalsChart({ stats }: CareerTotalsChartProps) {
  const [view, setView] = useState<ViewMode>("totals");

  const chartData = useMemo(() => {
    const seasonMap = new Map<
      number,
      {
        gamesPlayed: number;
        goals: number;
        assists: number;
        shots: number;
        xg: number;
        toiSeconds: number;
      }
    >();

    const regularSeasonStats = stats.filter(
      (s) => !s.isPlayoffs && s.situation === "all"
    );

    for (const stat of regularSeasonStats) {
      const existing = seasonMap.get(stat.season);
      if (existing) {
        existing.gamesPlayed += stat.gamesPlayed;
        existing.goals += stat.goals;
        existing.assists += stat.assists;
        existing.shots += stat.shots;
        existing.xg += stat.expectedGoals ?? 0;
        existing.toiSeconds += stat.iceTimeSeconds;
      } else {
        seasonMap.set(stat.season, {
          gamesPlayed: stat.gamesPlayed,
          goals: stat.goals,
          assists: stat.assists,
          shots: stat.shots,
          xg: stat.expectedGoals ?? 0,
          toiSeconds: stat.iceTimeSeconds,
        });
      }
    }

    const data: SeasonData[] = [];
    const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);

    for (const season of sortedSeasons) {
      const s = seasonMap.get(season)!;
      const gp = s.gamesPlayed;

      data.push({
        season,
        seasonLabel: formatSeason(season),
        gamesPlayed: gp,
        goals: s.goals,
        assists: s.assists,
        points: s.goals + s.assists,
        shots: s.shots,
        xg: s.xg,
        toiSeconds: s.toiSeconds,
        toiPerGame: gp > 0 ? s.toiSeconds / gp / 60 : 0,
        goalsPerGame: gp > 0 ? s.goals / gp : 0,
        assistsPerGame: gp > 0 ? s.assists / gp : 0,
        pointsPerGame: gp > 0 ? (s.goals + s.assists) / gp : 0,
        shotsPerGame: gp > 0 ? s.shots / gp : 0,
      });
    }

    return data;
  }, [stats]);

  const selectedView = VIEWS.find((v) => v.key === view)!;

  if (chartData.length < 2) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Career Stats</CardTitle>
        <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEWS.map((v) => (
              <SelectItem key={v.key} value={v.key}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {view === "toi" ? (
              <TOIChart data={chartData} />
            ) : view === "perGame" ? (
              <PerGameChart data={chartData} />
            ) : (
              <TotalsChart data={chartData} />
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedView.description}. Regular season only.
        </p>
      </CardContent>
    </Card>
  );
}

function TotalsChart({ data }: { data: SeasonData[] }) {
  return (
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <XAxis
        dataKey="seasonLabel"
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <YAxis
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        width={40}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <Tooltip content={<TotalsTooltip />} />
      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
      <Line
        type="monotone"
        dataKey="goals"
        name="Goals"
        stroke={CHART_COLOURS[1]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[1], r: 3 }}
        activeDot={{ r: 5 }}
      />
      <Line
        type="monotone"
        dataKey="assists"
        name="Assists"
        stroke={CHART_COLOURS[0]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[0], r: 3 }}
        activeDot={{ r: 5 }}
      />
      <Line
        type="monotone"
        dataKey="points"
        name="Points"
        stroke={CHART_COLOURS[3]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[3], r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  );
}

function PerGameChart({ data }: { data: SeasonData[] }) {
  return (
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <XAxis
        dataKey="seasonLabel"
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <YAxis
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        width={40}
        tickFormatter={(v: number) => v.toFixed(1)}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <Tooltip content={<PerGameTooltip />} />
      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
      <Line
        type="monotone"
        dataKey="goalsPerGame"
        name="G/GP"
        stroke={CHART_COLOURS[1]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[1], r: 3 }}
        activeDot={{ r: 5 }}
      />
      <Line
        type="monotone"
        dataKey="assistsPerGame"
        name="A/GP"
        stroke={CHART_COLOURS[0]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[0], r: 3 }}
        activeDot={{ r: 5 }}
      />
      <Line
        type="monotone"
        dataKey="pointsPerGame"
        name="P/GP"
        stroke={CHART_COLOURS[3]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[3], r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  );
}

function TOIChart({ data }: { data: SeasonData[] }) {
  const minTOI = Math.min(...data.map((d) => d.toiPerGame));
  const maxTOI = Math.max(...data.map((d) => d.toiPerGame));
  const padding = (maxTOI - minTOI) * 0.15;

  return (
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <XAxis
        dataKey="seasonLabel"
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <YAxis
        domain={[Math.max(0, minTOI - padding), maxTOI + padding]}
        tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
        width={40}
        tickFormatter={(v: number) => `${Math.round(v)}m`}
        stroke={CHART_AXIS_COLOURS.grid}
        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
      />
      <Tooltip content={<TOITooltip />} />
      <Line
        type="monotone"
        dataKey="toiPerGame"
        name="TOI/GP"
        stroke={CHART_COLOURS[4]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[4], r: 4 }}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  );
}

function TotalsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SeasonData }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">{data.seasonLabel}</p>
      <p className="text-muted-foreground">{data.gamesPlayed} GP</p>
      <div className="mt-2 space-y-1">
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[1] }}
          />
          Goals: <span className="font-medium">{data.goals}</span>
        </p>
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[0] }}
          />
          Assists: <span className="font-medium">{data.assists}</span>
        </p>
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[3] }}
          />
          Points: <span className="font-medium">{data.points}</span>
        </p>
      </div>
    </div>
  );
}

function PerGameTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SeasonData }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">{data.seasonLabel}</p>
      <p className="text-muted-foreground">{data.gamesPlayed} GP</p>
      <div className="mt-2 space-y-1">
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[1] }}
          />
          G/GP: <span className="font-medium">{data.goalsPerGame.toFixed(2)}</span>
        </p>
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[0] }}
          />
          A/GP: <span className="font-medium">{data.assistsPerGame.toFixed(2)}</span>
        </p>
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[3] }}
          />
          P/GP: <span className="font-medium">{data.pointsPerGame.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

function TOITooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SeasonData }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const avgSecondsPerGame =
    data.gamesPlayed > 0 ? data.toiSeconds / data.gamesPlayed : 0;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">{data.seasonLabel}</p>
      <p className="text-muted-foreground">{data.gamesPlayed} GP</p>
      <div className="mt-2">
        <p>
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: CHART_COLOURS[4] }}
          />
          TOI/GP: <span className="font-medium">{formatToi(avgSecondsPerGame)}</span>
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Total: {formatToi(data.toiSeconds)}
        </p>
      </div>
    </div>
  );
}
