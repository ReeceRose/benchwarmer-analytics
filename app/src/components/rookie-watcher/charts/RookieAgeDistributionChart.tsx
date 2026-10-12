import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CHART_AXIS_COLOURS, CHART_COLOURS } from "@/lib/chart-colours";
import type { Rookie } from "@/types";

interface RookieAgeDistributionChartProps {
  rookies: Rookie[];
}

interface ChartDataPoint {
  age: number;
  count: number;
  avgPoints: number;
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

  return (
    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm">
      <div className="font-semibold mb-2">Age {data.age}</div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Rookies:</span>{" "}
          <span className="tabular-nums font-semibold">{data.count}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Avg Points:</span>{" "}
          <span className="tabular-nums">{data.avgPoints.toFixed(1)}</span>
        </p>
      </div>
    </div>
  );
}

export function RookieAgeDistributionChart({
  rookies,
}: RookieAgeDistributionChartProps) {
  // Group rookies by age and calculate stats
  const ageGroups = rookies.reduce(
    (acc, rookie) => {
      if (!acc[rookie.age]) {
        acc[rookie.age] = { count: 0, totalPoints: 0 };
      }
      acc[rookie.age].count++;
      acc[rookie.age].totalPoints += rookie.points;
      return acc;
    },
    {} as Record<number, { count: number; totalPoints: number }>
  );

  const chartData: ChartDataPoint[] = Object.entries(ageGroups)
    .map(([age, data]) => ({
      age: parseInt(age, 10),
      count: data.count,
      avgPoints: data.totalPoints / data.count,
    }))
    .sort((a, b) => a.age - b.age);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Age distribution</CardTitle>
          <CardDescription>No data for this selection yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rookie age distribution</CardTitle>
        <CardDescription>
          Number of rookies by age (as of Sept 15)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis
              dataKey="age"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.age}`}
                  fill={CHART_COLOURS[index % CHART_COLOURS.length]}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
