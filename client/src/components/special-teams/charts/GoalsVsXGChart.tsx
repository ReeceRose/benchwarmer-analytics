import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import type { PowerPlaySummary, PenaltyKillSummary } from "@/types";

interface GoalsVsXGChartProps {
  powerPlay: PowerPlaySummary;
  penaltyKill: PenaltyKillSummary;
}

interface ChartDataPoint {
  name: string;
  label: string;
  goals: number;
  xGoals: number;
  diff: number;
  type: "pp" | "pk";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; dataKey: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const diff = data.goals - data.xGoals;
  const diffSign = diff > 0 ? "+" : "";
  const diffColor = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "";
  const isLucky = data.type === "pp" ? diff > 0 : diff < 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold mb-2">{data.label}</div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">
            {data.type === "pp" ? "Goals Scored:" : "Goals Against:"}
          </span>{" "}
          <span className="font-mono font-semibold">{data.goals}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Expected:</span>{" "}
          <span className="font-mono">{data.xGoals.toFixed(1)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className={`font-mono font-semibold ${diffColor}`}>
            {diffSign}{diff.toFixed(1)}
          </span>
        </p>
        <p className="mt-1 pt-1 border-t text-muted-foreground">
          {isLucky ? "Outperforming expectation" : "Underperforming expectation"}
        </p>
      </div>
    </div>
  );
}

export function GoalsVsXGChart({ powerPlay, penaltyKill }: GoalsVsXGChartProps) {
  const chartData: ChartDataPoint[] = [
    {
      name: "PP",
      label: "Power Play",
      goals: powerPlay.goals,
      xGoals: powerPlay.xGoals,
      diff: powerPlay.goals - powerPlay.xGoals,
      type: "pp",
    },
    {
      name: "PK",
      label: "Penalty Kill",
      goals: penaltyKill.goalsAgainst,
      xGoals: penaltyKill.xGoalsAgainst,
      diff: penaltyKill.goalsAgainst - penaltyKill.xGoalsAgainst,
      type: "pk",
    },
  ];

  const maxValue = Math.max(
    powerPlay.goals,
    powerPlay.xGoals,
    penaltyKill.goalsAgainst,
    penaltyKill.xGoalsAgainst
  );

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        Goals vs Expected Goals
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, bottom: 5, left: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(maxValue * 1.2)]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
          />
          <ReferenceLine y={0} stroke={CHART_AXIS_COLOURS.grid} />
          <Bar
            dataKey="goals"
            name="Actual Goals"
            fill={SEMANTIC_COLOURS.success}
            radius={[4, 4, 0, 0]}
            fillOpacity={0.85}
          />
          <Bar
            dataKey="xGoals"
            name="Expected (xG)"
            fill={SEMANTIC_COLOURS.warning}
            radius={[4, 4, 0, 0]}
            fillOpacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        PP: Goals scored above xG is good. PK: Goals against below xGA is good.
      </p>
    </div>
  );
}
