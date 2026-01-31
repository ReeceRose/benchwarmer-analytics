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
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatGameTime } from "@/lib/formatters";
import type { GameShotsResponse, GameShot } from "@/types";

interface XGProgressionChartProps {
  shotsData: GameShotsResponse;
}

interface ChartDataPoint {
  gameSeconds: number;
  timeLabel: string;
  period: number;
  homeXG: number;
  awayXG: number;
  event?: {
    team: "home" | "away";
    isGoal: boolean;
    shooterName: string | null;
    xGoal: number;
  };
}

/** Period end times in game seconds (20, 40, 60 minutes) */
const PERIOD_END_TIMES = [1200, 2400, 3600];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; dataKey: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.timeLabel}</p>
      <div className="space-y-1 text-xs">
        {payload.map((p) => (
          <p key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>
              {p.dataKey === "homeXG" ? "Home xG:" : "Away xG:"}
            </span>
            <span className="font-mono font-semibold">
              {(p.payload[p.dataKey as keyof ChartDataPoint] as number).toFixed(
                2,
              )}
            </span>
          </p>
        ))}
      </div>
      {data.event && (
        <div className="mt-2 pt-2 border-t text-xs">
          <p
            className={
              data.event.isGoal
                ? "text-success font-semibold"
                : "text-muted-foreground"
            }
          >
            {data.event.isGoal ? "GOAL" : "Shot"}:{" "}
            {data.event.shooterName ?? "Unknown"}
          </p>
          <p className="text-muted-foreground">
            xG: {(data.event.xGoal * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

export function XGProgressionChart({ shotsData }: XGProgressionChartProps) {
  const chartData = useMemo(() => {
    // Combine all shots and sort by game time
    const allShots: Array<GameShot & { team: "home" | "away" }> = [
      ...shotsData.homeShots.map((s) => ({ ...s, team: "home" as const })),
      ...shotsData.awayShots.map((s) => ({ ...s, team: "away" as const })),
    ].sort((a, b) => a.gameSeconds - b.gameSeconds);

    // Build cumulative xG data
    const data: ChartDataPoint[] = [];
    let homeXG = 0;
    let awayXG = 0;

    // Start at 0
    data.push({
      gameSeconds: 0,
      timeLabel: "Start",
      period: 1,
      homeXG: 0,
      awayXG: 0,
    });

    for (const shot of allShots) {
      if (shot.team === "home") {
        homeXG += shot.xGoal;
      } else {
        awayXG += shot.xGoal;
      }

      data.push({
        gameSeconds: shot.gameSeconds,
        timeLabel: formatGameTime(shot.gameSeconds),
        period: shot.period,
        homeXG,
        awayXG,
        event: {
          team: shot.team,
          isGoal: shot.isGoal,
          shooterName: shot.shooterName,
          xGoal: shot.xGoal,
        },
      });
    }

    // Add end point if game finished
    const maxTime = Math.max(...allShots.map((s) => s.gameSeconds), 3600);
    if (data.length > 0 && data[data.length - 1].gameSeconds < maxTime) {
      data.push({
        gameSeconds: maxTime,
        timeLabel: "End",
        period: Math.ceil(maxTime / 1200),
        homeXG,
        awayXG,
      });
    }

    return data;
  }, [shotsData]);

  const homeTotal =
    chartData.length > 0 ? chartData[chartData.length - 1].homeXG : 0;
  const awayTotal =
    chartData.length > 0 ? chartData[chartData.length - 1].awayXG : 0;
  const xgDiff = Math.abs(homeTotal - awayTotal);
  const xgWinner =
    homeTotal > awayTotal ? shotsData.homeTeamCode : shotsData.awayTeamCode;

  // Calculate actual goals
  const homeGoals = shotsData.homeShots.filter((s) => s.isGoal).length;
  const awayGoals = shotsData.awayShots.filter((s) => s.isGoal).length;

  if (chartData.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">xG Progression</CardTitle>
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
        <CardTitle className="text-lg">Expected Goals Progression</CardTitle>
        <CardDescription>
          {xgWinner} led by {xgDiff.toFixed(2)} xG | Final:{" "}
          {shotsData.awayTeamCode} {awayGoals} - {homeGoals}{" "}
          {shotsData.homeTeamCode}
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
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => v.toFixed(1)}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />

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
              dataKey="homeXG"
              name={shotsData.homeTeamCode}
              stroke={SEMANTIC_COLOURS.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: SEMANTIC_COLOURS.primary }}
            />
            <Line
              type="stepAfter"
              dataKey="awayXG"
              name={shotsData.awayTeamCode}
              stroke={SEMANTIC_COLOURS.danger}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: SEMANTIC_COLOURS.danger }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground"
          aria-label="Chart legend"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5 rounded-sm"
              style={{ backgroundColor: SEMANTIC_COLOURS.primary }}
            />
            <span>{shotsData.homeTeamCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5 rounded-sm"
              style={{ backgroundColor: SEMANTIC_COLOURS.danger }}
            />
            <span>{shotsData.awayTeamCode}</span>
          </div>
        </div>

        <div className="flex justify-center gap-8 mt-8 pt-8 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground text-xs">
              {shotsData.homeTeamCode} xG
            </div>
            <div
              className="font-mono font-semibold"
              style={{ color: SEMANTIC_COLOURS.primary }}
            >
              {homeTotal.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">
              {shotsData.awayTeamCode} xG
            </div>
            <div
              className="font-mono font-semibold"
              style={{ color: SEMANTIC_COLOURS.danger }}
            >
              {awayTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Cumulative expected goals as the game progresses. Dotted lines
          indicate period breaks.
        </p>
      </CardContent>
    </Card>
  );
}
