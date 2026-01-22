import { useNavigate } from "@tanstack/react-router";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { CHART_COLORS, CHART_AXIS_COLORS } from "@/lib/chart-colors";
import type { OutlierEntry } from "@/types";

interface LuckChartProps {
  runningHot: OutlierEntry[];
  runningCold: OutlierEntry[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team?: string;
  xG: number;
  goals: number;
  differential: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isHot = data.differential > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">{data.name}</p>
      {data.team && (
        <p className="text-muted-foreground text-xs">{data.team}</p>
      )}
      <div className="mt-2 space-y-1">
        <p>
          <span className="text-muted-foreground">Goals:</span>{" "}
          <span className="font-mono">{data.goals}</span>
        </p>
        <p>
          <span className="text-muted-foreground">xG:</span>{" "}
          <span className="font-mono">{data.xG.toFixed(1)}</span>
        </p>
        <p className={isHot ? "text-green-600" : "text-destructive"}>
          <span className="text-muted-foreground">Diff:</span>{" "}
          <span className="font-mono">
            {isHot ? "+" : ""}
            {data.differential.toFixed(1)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function LuckChart({ runningHot, runningCold }: LuckChartProps) {
  const navigate = useNavigate();

  // Combine hot and cold data for the scatter plot
  const chartData: ChartDataPoint[] = [
    ...runningHot.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      xG: p.expectedGoals,
      goals: p.goals,
      differential: p.differential,
    })),
    ...runningCold.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      xG: p.expectedGoals,
      goals: p.goals,
      differential: p.differential,
    })),
  ];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Luck vs. Skill
          </CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/players/$id",
      params: { id: data.playerId.toString() },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Luck vs. Skill
        </CardTitle>
        <CardDescription>
          Players above the line are outperforming expected goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLORS.grid} strokeOpacity={CHART_AXIS_COLORS.gridOpacity} />
            <XAxis
              dataKey="xG"
              name="Expected Goals"
              type="number"
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin - 2)),
                (dataMax: number) => Math.ceil(dataMax + 2),
              ]}
              tickCount={6}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
              label={{
                value: "Expected Goals (xG)",
                position: "bottom",
                offset: 0,
                fill: CHART_AXIS_COLORS.tick,
                fontSize: 12,
              }}
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <YAxis
              dataKey="goals"
              name="Goals"
              type="number"
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin - 2)),
                (dataMax: number) => Math.ceil(dataMax + 2),
              ]}
              tickCount={6}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
              label={{
                value: "Actual Goals",
                angle: -90,
                position: "insideLeft",
                fill: CHART_AXIS_COLORS.tick,
                fontSize: 12,
              }}
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              ifOverflow="hidden"
              segment={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              stroke={CHART_AXIS_COLORS.reference}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            <Scatter
              data={chartData}
              fill={CHART_COLORS[0]}
              fillOpacity={0.8}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <span>Above line = Running hot</span>
          <span>Below line = Running cold</span>
        </div>
      </CardContent>
    </Card>
  );
}
