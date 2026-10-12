import { useNavigate } from "@tanstack/react-router";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import type { StandingsWithAnalytics } from "@/types";

interface GoalDifferentialChartProps {
  teams: StandingsWithAnalytics[];
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isPositive = data.diff > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Goals For:</span>{" "}
          <span className="font-mono">{data.goalsFor}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Goals Against:</span>{" "}
          <span className="font-mono">{data.goalsAgainst}</span>
        </p>
        <p className={isPositive ? "text-success" : "text-destructive"}>
          <span className="text-muted-foreground">Differential:</span>{" "}
          <span className="font-mono font-semibold">
            {isPositive ? "+" : ""}
            {data.diff}
          </span>
        </p>
      </div>
    </div>
  );
}

// Custom Y-axis tick with team logo
function CustomYAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  if (!payload?.value || x === undefined || y === undefined) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <image
        href={getTeamLogoUrl(payload.value)}
        x={-32}
        y={-12}
        width={24}
        height={24}
      />
    </g>
  );
}

export function GoalDifferentialChart({ teams }: GoalDifferentialChartProps) {
  const navigate = useNavigate();

  // Prepare and sort by goal differential
  const chartData: ChartDataPoint[] = [...teams]
    .map((team) => ({
      abbrev: team.abbreviation,
      name: team.name,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      diff: team.goalDifferential,
    }))
    .sort((a, b) => b.diff - a.diff);

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/teams/$abbrev",
      params: { abbrev: data.abbrev },
    });
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Differential</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate symmetric domain around 0
  const maxAbsDiff = Math.max(...chartData.map((d) => Math.abs(d.diff)));
  const domain = Math.ceil(maxAbsDiff / 10) * 10 + 10;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Goal Differential</CardTitle>
        <CardDescription>
          Goals for minus goals against - sorted by differential
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={1000}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-domain, domain]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="abbrev"
              tick={<CustomYAxisTick />}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }}
            />

            <ReferenceLine
              x={0}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeWidth={1}
            />

            <Bar
              dataKey="diff"
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.abbrev}
                  fill={
                    entry.diff >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Positive (More GF than GA)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(0, 72%, 51%)" }}
            />
            <span className="text-muted-foreground">
              Negative (More GA than GF)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
