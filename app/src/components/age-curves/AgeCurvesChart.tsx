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
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_COLOURS, AGE_PHASE_COLOURS } from "@/lib/chart-colours";

export interface PlayerInfo {
  playerId: number;
  playerName: string;
  color: string;
  dataKey: string;
}

export interface ChartDataPoint {
  age: number;
  league: number | null;
  leagueP25?: number | null;
  leagueP75?: number | null;
  leagueBandBase?: number | null;
  leagueBandRange?: number | null;
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
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <XAxis
                dataKey="age"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
                tickFormatter={(v: number) => `${v}`}
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
                width={45}
                tickFormatter={(v: number) => v.toFixed(1)}
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
                width={35}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const metricPayload = payload.filter(
                    (p: { dataKey?: string }) =>
                      p.dataKey !== "leagueSample" &&
                      p.dataKey !== "leagueBandBase" &&
                      p.dataKey !== "leagueBandRange",
                  );
                  const row = payload[0]?.payload as ChartDataPoint | undefined;
                  return (
                    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm">
                      <p className="font-semibold mb-2">Age {label}</p>
                      {row?.leagueP25 != null &&
                        row?.leagueP75 != null &&
                        row.leagueP75 >= row.leagueP25 && (
                          <div className="flex justify-between gap-4 text-xs mb-2">
                            <span className="text-muted-foreground">
                              Typical range (25–75%)
                            </span>
                            <span className="font-medium">
                              {row.leagueP25.toFixed(2)} –{" "}
                              {row.leagueP75.toFixed(2)}
                            </span>
                          </div>
                        )}
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
                        ),
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
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="plainline"
                wrapperStyle={{ fontSize: 12 }}
              />
              <ReferenceArea
                x1={18}
                x2={24}
                yAxisId="left"
                fill={AGE_PHASE_COLOURS.development}
                fillOpacity={0.04}
                label={{
                  value: "Development",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: CHART_AXIS_COLOURS.tick,
                  fillOpacity: 0.6,
                }}
              />
              <ReferenceArea
                x1={24}
                x2={30}
                yAxisId="left"
                fill={AGE_PHASE_COLOURS.prime}
                fillOpacity={0.04}
                label={{
                  value: "Prime",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: CHART_AXIS_COLOURS.tick,
                  fillOpacity: 0.6,
                }}
              />
              <ReferenceArea
                x1={30}
                x2={45}
                yAxisId="left"
                fill={AGE_PHASE_COLOURS.decline}
                fillOpacity={0.04}
                label={{
                  value: "Decline",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: CHART_AXIS_COLOURS.tick,
                  fillOpacity: 0.6,
                }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="leagueSample"
                name="Sample size"
                fill={CHART_AXIS_COLOURS.reference}
                stroke="none"
                fillOpacity={0.035}
                legendType="none"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="leagueBandBase"
                stackId="leagueBand"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="leagueBandRange"
                stackId="leagueBand"
                stroke="none"
                fill={CHART_AXIS_COLOURS.reference}
                fillOpacity={0.12}
                isAnimationActive={false}
                legendType="none"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="league"
                name={useMedian ? "League median" : "League average"}
                stroke={CHART_AXIS_COLOURS.reference}
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
        <p className="mt-4 text-xs text-muted-foreground">
          Ages along the bottom. League {useMedian ? "medians" : "averages"} use
          every qualifying season (at least {minGames} games); the darker band is
          the middle half of players, and the faint shading is sample size
          (right axis), which thins out after 35.
          {playerInfo.length > 0 &&
            " Player data points shown for each season played."}{" "}
          Click on any age to see the distribution.
        </p>
      </CardContent>
    </Card>
  );
}
