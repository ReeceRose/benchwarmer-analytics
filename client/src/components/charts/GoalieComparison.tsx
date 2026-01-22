import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, CHART_AXIS_COLORS } from "@/lib/chart-colors";
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
}

const GOALIE_STAT_DEFS: GoalieStatDef[] = [
  {
    key: "svPct",
    label: "Save %",
    getValue: (s) => (s.savePercentage != null ? s.savePercentage * 100 : null),
    format: (v) => v.toFixed(2) + "%",
    higherIsBetter: true,
  },
  {
    key: "gaa",
    label: "GAA",
    getValue: (s) => s.goalsAgainstAverage ?? null,
    format: (v) => v.toFixed(2),
    higherIsBetter: false,
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
    label: "HD Save %",
    getValue: (s) => {
      const hdShots = s.highDangerShots;
      const hdGoals = s.highDangerGoals;
      if (hdShots == null || hdShots === 0) return null;
      return ((hdShots - hdGoals) / hdShots) * 100;
    },
    format: (v) => v.toFixed(1) + "%",
    higherIsBetter: true,
  },
];

// Custom tooltip component for goalie chart
function GoalieChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    payload: Record<string, string | number | null>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
            <span className="font-mono ml-auto">
              {data[`${entry.name}_formatted`] ?? "-"}
            </span>
          </div>
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
  // Filter out players without stats
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

  // Build chart data - one bar per stat, grouped by players
  const chartData = GOALIE_STAT_DEFS.map((def) => {
    const dataPoint: Record<string, string | number | null> = {
      stat: def.label,
    };

    validPlayers.forEach((player) => {
      const value = def.getValue(player.stats!);
      dataPoint[player.name] = value;
      // Store raw value for tooltip formatting
      dataPoint[`${player.name}_formatted`] =
        value !== null ? def.format(value) : "-";
    });

    return dataPoint;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLORS.grid} strokeOpacity={CHART_AXIS_COLORS.gridOpacity} />
            <XAxis
              type="number"
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <YAxis
              type="category"
              dataKey="stat"
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<GoalieChartTooltip />} />
            {validPlayers.map((player, i) => (
              <Bar
                key={player.name}
                dataKey={player.name}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.8}
                radius={[0, 4, 4, 0]}
              />
            ))}
            {validPlayers.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value) => (
                  <span className="text-foreground">{value}</span>
                )}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Key goalie metrics comparison
        </p>
      </CardContent>
    </Card>
  );
}
