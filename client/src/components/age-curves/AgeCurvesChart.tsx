import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_COLORS } from "@/lib/chart-colors";

export interface PlayerInfo {
  playerId: number;
  playerName: string;
  color: string;
  dataKey: string;
}

export interface ChartDataPoint {
  age: number;
  league: number | null;
  leagueSample: number;
  [key: string]: number | null | undefined;
}

interface AgeCurvesChartProps {
  chartData: ChartDataPoint[];
  playerInfo: PlayerInfo[];
  title: string;
  useMedian: boolean;
  minGames: number;
  onAgeClick?: (age: number) => void;
}

export function AgeCurvesChart({
  chartData,
  playerInfo,
  title,
  useMedian,
  minGames,
  onAgeClick,
}: AgeCurvesChartProps) {
  const handleChartClick = (e: { activeLabel?: string | number }) => {
    if (e.activeLabel !== undefined && onAgeClick) {
      const age =
        typeof e.activeLabel === "string"
          ? parseInt(e.activeLabel, 10)
          : e.activeLabel;
      if (!isNaN(age) && age >= 18 && age <= 45) {
        onAgeClick(age);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 50, left: 0, bottom: 0 }}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
              />
              <XAxis
                dataKey="age"
                tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                tickFormatter={(v: number) => `${v}`}
                label={{
                  value: "Age",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 12,
                  fill: CHART_AXIS_COLORS.tick,
                }}
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                width={45}
                tickFormatter={(v: number) => v.toFixed(1)}
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                width={35}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const metricPayload = payload.filter(
                    (p: { dataKey?: string }) => p.dataKey !== "leagueSample"
                  );
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold mb-2">Age {label}</p>
                      {metricPayload.map(
                        (p: {
                          dataKey?: string;
                          color?: string;
                          name?: string;
                          value?: number;
                          payload?: Record<string, number>;
                        }) => (
                          <div
                            key={p.dataKey}
                            className="flex justify-between gap-4"
                          >
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span className="font-medium">
                              {typeof p.value === "number"
                                ? p.value.toFixed(2)
                                : "-"}
                            </span>
                          </div>
                        )
                      )}
                      {payload[0]?.payload?.leagueSample > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          Sample:{" "}
                          {payload[0].payload.leagueSample.toLocaleString()}{" "}
                          player-seasons
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="leagueSample"
                name="Sample Size"
                fill={CHART_AXIS_COLORS.reference}
                stroke="none"
                fillOpacity={0.1}
                legendType="none"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="league"
                name={useMedian ? "League Median" : "League Average"}
                stroke={CHART_AXIS_COLORS.reference}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
              {playerInfo.map((player) => (
                <Line
                  yAxisId="left"
                  key={player.playerId}
                  type="monotone"
                  dataKey={player.dataKey}
                  name={player.playerName}
                  stroke={player.color}
                  strokeWidth={2}
                  dot={{ fill: player.color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          League {useMedian ? "medians" : "averages"} based on all qualifying
          seasons (min {minGames} games played). The subtle shading shows sample
          size — note the drop after age 35.
          {playerInfo.length > 0 &&
            " Player data points shown for each season played."}{" "}
          Click on any age to see the distribution.
        </p>
      </CardContent>
    </Card>
  );
}
