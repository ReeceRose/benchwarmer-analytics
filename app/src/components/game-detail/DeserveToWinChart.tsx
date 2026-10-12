import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatGameTime, formatPercent } from "@/lib/formatters";
import type { DeserveToWinResponse } from "@/types";

interface DeserveToWinChartProps {
  data: DeserveToWinResponse;
}

interface ChartDataPoint {
  gameSeconds: number;
  timeLabel: string;
  period: number;
  homePoissonPct: number;
  homeMonteCarloPct: number;
  awayPoissonPct: number;
  awayMonteCarloPct: number;
  wasGoal: boolean | null;
  isHomeShot: boolean;
  shotXG: number;
  homeTeamCode: string;
  awayTeamCode: string;
}

const PERIOD_END_TIMES = [1200, 2400, 3600];

function GoalDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  dataKey?: string;
}) {
  const { cx, cy, payload, dataKey } = props;
  if (!cx || !cy || !payload?.wasGoal) return null;

  const isHomeLine = dataKey === "homeMonteCarloPct" || dataKey === "homePoissonPct";
  const isHomeGoal = payload.isHomeShot;
  if (isHomeLine !== isHomeGoal) return null;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={isHomeGoal ? SEMANTIC_COLOURS.primary : SEMANTIC_COLOURS.danger}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    dataKey: string;
    color: string;
    value: number;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const mcHome = payload.find((p) => p.dataKey === "homeMonteCarloPct");
  const mcAway = payload.find((p) => p.dataKey === "awayMonteCarloPct");
  const poissonHome = payload.find((p) => p.dataKey === "homePoissonPct");
  const poissonAway = payload.find((p) => p.dataKey === "awayPoissonPct");

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.timeLabel}</p>
      <div className="space-y-2 text-xs">
        <div>
          <p className="text-muted-foreground mb-1">Monte Carlo</p>
          {mcHome && (
            <p className="flex justify-between gap-4">
              <span style={{ color: mcHome.color }}>{data.homeTeamCode}:</span>
              <span className="font-mono font-semibold">
                {mcHome.value.toFixed(1)}%
              </span>
            </p>
          )}
          {mcAway && (
            <p className="flex justify-between gap-4">
              <span style={{ color: mcAway.color }}>{data.awayTeamCode}:</span>
              <span className="font-mono font-semibold">
                {mcAway.value.toFixed(1)}%
              </span>
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Poisson</p>
          {poissonHome && (
            <p className="flex justify-between gap-4">
              <span style={{ color: poissonHome.color }}>{data.homeTeamCode}:</span>
              <span className="font-mono font-semibold">
                {poissonHome.value.toFixed(1)}%
              </span>
            </p>
          )}
          {poissonAway && (
            <p className="flex justify-between gap-4">
              <span style={{ color: poissonAway.color }}>{data.awayTeamCode}:</span>
              <span className="font-mono font-semibold">
                {poissonAway.value.toFixed(1)}%
              </span>
            </p>
          )}
        </div>
      </div>
      {data.wasGoal && (
        <div className="mt-2 pt-2 border-t text-xs">
          <p className="text-success font-semibold">
            GOAL ({data.isHomeShot ? data.homeTeamCode : data.awayTeamCode})
          </p>
          <p className="text-muted-foreground">
            Shot xG: {(data.shotXG * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

export function DeserveToWinChart({ data }: DeserveToWinChartProps) {
  const chartData = useMemo(() => {
    const points: ChartDataPoint[] = [];

    points.push({
      gameSeconds: 0,
      timeLabel: "Start",
      period: 1,
      homePoissonPct: 50,
      homeMonteCarloPct: 50,
      awayPoissonPct: 50,
      awayMonteCarloPct: 50,
      wasGoal: null,
      isHomeShot: false,
      shotXG: 0,
      homeTeamCode: data.homeTeamCode,
      awayTeamCode: data.awayTeamCode,
    });

    for (const point of data.progression) {
      points.push({
        gameSeconds: point.gameTimeSeconds,
        timeLabel: formatGameTime(point.gameTimeSeconds),
        period: point.period,
        homePoissonPct: point.homePoissonWinPct * 100,
        homeMonteCarloPct: point.homeMonteCarloWinPct * 100,
        awayPoissonPct: (1 - point.homePoissonWinPct) * 100,
        awayMonteCarloPct: (1 - point.homeMonteCarloWinPct) * 100,
        wasGoal: point.wasGoal,
        isHomeShot: point.isHomeShot,
        shotXG: point.shotXG,
        homeTeamCode: data.homeTeamCode,
        awayTeamCode: data.awayTeamCode,
      });
    }

    return points;
  }, [data.progression, data.homeTeamCode, data.awayTeamCode]);

  const homeWinPct = data.homeSummary.monteCarloWinPct * 100;
  const awayWinPct = data.awaySummary.monteCarloWinPct * 100;
  const deservedWinner =
    homeWinPct > awayWinPct ? data.homeTeamCode : data.awayTeamCode;
  const winPctDiff = Math.abs(homeWinPct - awayWinPct);

  const actualWinner =
    data.homeGoals > data.awayGoals ? data.homeTeamCode : data.awayTeamCode;

  if (chartData.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deserve to Win Meter</CardTitle>
          <CardDescription>
            No shot data available for this game
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Deserve to Win Meter</CardTitle>
        <CardDescription>
          {deservedWinner} deserved to win by {winPctDiff.toFixed(1)}% | Actual
          winner: {actualWinner}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, bottom: 30, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <XAxis
              dataKey="gameSeconds"
              type="number"
              domain={[0, "dataMax"]}
              ticks={[0, 1200, 2400, 3600]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => `${Math.floor(v / 60)}`}
              label={{
                value: "Game Time (minutes)",
                position: "bottom",
                offset: 10,
                fontSize: 11,
                fill: CHART_AXIS_COLOURS.tick,
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => `${v}%`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeOpacity={0.7}
            />

            {PERIOD_END_TIMES.map((time) => (
              <ReferenceLine
                key={time}
                x={time}
                stroke={CHART_AXIS_COLOURS.reference}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            ))}

            <Line
              type="stepAfter"
              dataKey="homeMonteCarloPct"
              name={`${data.homeTeamCode} (MC)`}
              stroke={SEMANTIC_COLOURS.primary}
              strokeWidth={2}
              dot={<GoalDot />}
              activeDot={{ r: 4, fill: SEMANTIC_COLOURS.primary }}
            />
            <Line
              type="stepAfter"
              dataKey="homePoissonPct"
              name={`${data.homeTeamCode} (Poisson)`}
              stroke={SEMANTIC_COLOURS.primary}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 3, fill: SEMANTIC_COLOURS.primary }}
            />
            <Line
              type="stepAfter"
              dataKey="awayMonteCarloPct"
              name={`${data.awayTeamCode} (MC)`}
              stroke={SEMANTIC_COLOURS.danger}
              strokeWidth={2}
              dot={<GoalDot />}
              activeDot={{ r: 4, fill: SEMANTIC_COLOURS.danger }}
            />
            <Line
              type="stepAfter"
              dataKey="awayPoissonPct"
              name={`${data.awayTeamCode} (Poisson)`}
              stroke={SEMANTIC_COLOURS.danger}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 3, fill: SEMANTIC_COLOURS.danger }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          className="mt-2 flex flex-col items-center gap-1 text-xs text-muted-foreground"
          aria-label="Chart legend"
        >
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-5 rounded-sm"
                style={{ backgroundColor: SEMANTIC_COLOURS.primary }}
              />
              <span>{data.homeTeamCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-5 rounded-sm"
                style={{ backgroundColor: SEMANTIC_COLOURS.danger }}
              />
              <span>{data.awayTeamCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-current" />
              <span>Monte Carlo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  backgroundImage: "linear-gradient(to right, currentColor 50%, transparent 50%)",
                  backgroundSize: "4px 1px",
                }}
              />
              <span>Poisson</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-muted-foreground text-xs mb-1">
              {data.homeTeamCode}
            </div>
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: SEMANTIC_COLOURS.primary }}
            >
              {formatPercent(data.homeSummary.monteCarloWinPct)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.homeSummary.totalXG.toFixed(2)} xG •{" "}
              {data.homeSummary.shotsExcludingEmptyNet} shots
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs mb-1">
              {data.awayTeamCode}
            </div>
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: SEMANTIC_COLOURS.danger }}
            >
              {formatPercent(data.awaySummary.monteCarloWinPct)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.awaySummary.totalXG.toFixed(2)} xG •{" "}
              {data.awaySummary.shotsExcludingEmptyNet} shots
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Win probability based on 10,000 Monte Carlo simulations using shot xG.
          Circles indicate goals scored.
        </p>
      </CardContent>
    </Card>
  );
}

export function DeserveToWinChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full h-72 rounded-lg" />
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="flex justify-center gap-6">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        </div>
        <Skeleton className="h-3 w-80 mx-auto mt-4" />
      </CardContent>
    </Card>
  );
}
