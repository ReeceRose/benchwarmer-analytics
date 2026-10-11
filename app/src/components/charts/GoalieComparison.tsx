import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLOURS, CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import type { GoalieStats } from "@/types";

interface GoalieData {
  name: string;
  stats: GoalieStats | null | undefined;
}

interface GoalieComparisonProps {
  players: GoalieData[];
  title?: string;
  className?: string;
}

// Stat definitions for goalie comparison
interface GoalieStatDef {
  key: string;
  label: string;
  getValue: (stats: GoalieStats) => number | null;
  format: (value: number) => string;
  higherIsBetter: boolean;
  domain?: [number, number];
}

const GOALIE_STAT_DEFS: GoalieStatDef[] = [
  {
    key: "svPct",
    label: "Save %",
    getValue: (s) => s.savePercentage ?? null,
    format: (v) =>
      v == null
        ? "-"
        : v >= 1
          ? v.toFixed(3)
          : `.${(v * 1000).toFixed(0).padStart(3, "0")}`,
    higherIsBetter: true,
    domain: [0.85, 0.95],
  },
  {
    key: "gaa",
    label: "GAA",
    getValue: (s) => s.goalsAgainstAverage ?? null,
    format: (v) => v.toFixed(2),
    higherIsBetter: false,
    domain: [2, 4],
  },
  {
    key: "gsae",
    label: "GSAE",
    getValue: (s) => s.goalsSavedAboveExpected ?? null,
    format: (v) => v.toFixed(1),
    higherIsBetter: true,
  },
  {
    key: "hdSvPct",
    label: "HD Sv%",
    getValue: (s) => {
      const hdShots = s.highDangerShots;
      const hdGoals = s.highDangerGoals;
      if (hdShots == null || hdShots === 0) return null;
      return (hdShots - hdGoals) / hdShots;
    },
    format: (v) =>
      v == null
        ? "-"
        : v >= 1
          ? v.toFixed(3)
          : `.${(v * 1000).toFixed(0).padStart(3, "0")}`,
    higherIsBetter: true,
    domain: [0.65, 0.9],
  },
];

// Custom tooltip for individual stat chart
function StatTooltip({
  active,
  payload,
  statDef,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { name: string; value: number };
  }>;
  statDef: GoalieStatDef;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-sm">
      <span className="font-medium">{data.name}: </span>
      <span className="font-mono">{statDef.format(data.value)}</span>
    </div>
  );
}

// Individual stat mini-chart
function StatMiniChart({
  statDef,
  players,
}: {
  statDef: GoalieStatDef;
  players: GoalieData[];
}) {
  const chartData = players
    .filter((p) => p.stats != null)
    .map((player, i) => ({
      name: player.name.split(" ").pop() || player.name, // Last name only
      fullName: player.name,
      value: statDef.getValue(player.stats!),
      color: CHART_COLOURS[i % CHART_COLOURS.length],
    }))
    .filter((d) => d.value !== null);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {statDef.label}
        </p>
        <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
          No data
        </div>
      </div>
    );
  }

  // Calculate domain
  const values = chartData.map((d) => d.value as number);
  let domain: [number, number];

  if (statDef.domain) {
    // Use predefined domain but extend if values are outside
    const min = Math.min(statDef.domain[0], ...values);
    const max = Math.max(statDef.domain[1], ...values);
    domain = [min, max];
  } else {
    // Dynamic domain with padding
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.2 || Math.abs(max) * 0.1 || 1;
    domain = [Math.min(0, min - padding), max + padding];
  }

  // Determine best value for highlighting
  const bestValue = statDef.higherIsBetter
    ? Math.max(...values)
    : Math.min(...values);

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-medium text-foreground mb-1">
        {statDef.label}
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            tickFormatter={(v: number) => statDef.format(v)}
            width={45}
            axisLine={false}
            tickLine={false}
          />
          {domain[0] < 0 && domain[1] > 0 && (
            <ReferenceLine y={0} stroke="var(--border)" />
          )}
          <Tooltip content={<StatTooltip statDef={statDef} />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                fillOpacity={entry.value === bestValue ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs mt-1">
        {chartData.map((d, i) => (
          <span
            key={i}
            style={{
              color: d.value === bestValue ? undefined : CHART_AXIS_COLOURS.tick,
            }}
            className={`font-mono ${d.value === bestValue ? "text-foreground font-semibold" : ""}`}
          >
            {statDef.format(d.value as number)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GoalieComparison({
  players,
  title = "Goalie Comparison",
  className,
}: GoalieComparisonProps) {
  const validPlayers = players.filter((p) => p.stats != null);

  if (validPlayers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No goalie stats available for comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-6 mb-4">
          {validPlayers.map((player, i) => (
            <div key={player.name} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CHART_COLOURS[i % CHART_COLOURS.length],
                }}
              />
              <span className="text-sm">{player.name}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GOALIE_STAT_DEFS.map((def) => (
            <StatMiniChart key={def.key} statDef={def} players={players} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
