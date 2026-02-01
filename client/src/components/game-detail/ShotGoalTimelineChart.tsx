import { useMemo } from "react";
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import type { GameShotsResponse } from "@/types";

interface ShotGoalTimelineChartProps {
  shotsData: GameShotsResponse;
}

type TeamSide = "home" | "away";

interface TimelineEvent {
  id: string;
  team: TeamSide;
  teamCode: string;
  period: number;
  gameSeconds: number;
  y: number;
  isGoal: boolean;
  shotWasOnGoal: boolean;
  shotType: string | null;
  shooterName: string | null;
  shooterPosition: string | null;
  xGoal: number;
  shotDistance: number;
  shotAngle: number;
  shotRebound: boolean;
  shotRush: boolean;
  homeSkatersOnIce: number;
  awaySkatersOnIce: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPeriod(period: number): string {
  if (period <= 3) return `P${period}`;
  if (period === 4) return "OT";
  return `OT${period - 3}`;
}

function getResultLabel(e: TimelineEvent): string {
  if (e.isGoal) return "GOAL";
  if (e.shotWasOnGoal) return "Save";
  return "Missed";
}

function getStrengthLabel(
  home: number,
  away: number,
  isHomeTeam: boolean
): string | null {
  const shooterSkaters = isHomeTeam ? home : away;
  const defenderSkaters = isHomeTeam ? away : home;

  if (shooterSkaters === defenderSkaters) return null;
  if (shooterSkaters > defenderSkaters) return "PP";
  return "SH";
}

function TimelineMarker(props: {
  cx?: number;
  cy?: number;
  payload?: TimelineEvent;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  const teamColour =
    payload.team === "home" ? SEMANTIC_COLOURS.primary : SEMANTIC_COLOURS.danger;

  const r = payload.isGoal
    ? 7
    : Math.max(2.5, Math.min(5, 2.5 + payload.xGoal * 10));

  if (payload.isGoal) {
    const d = r;
    return (
      <g>
        <polygon
          points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`}
          fill={teamColour}
          stroke="white"
          strokeWidth={1}
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={teamColour}
      fillOpacity={0.25}
      stroke={teamColour}
      strokeOpacity={0.8}
      strokeWidth={1}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimelineEvent }>;
}) {
  const event = payload?.[0]?.payload;
  if (!active || !event) return null;

  const isHomeTeam = event.team === "home";
  const strength = getStrengthLabel(
    event.homeSkatersOnIce,
    event.awaySkatersOnIce,
    isHomeTeam
  );

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold mb-2 flex items-center justify-between gap-4">
        <span>{event.teamCode}</span>
        <span className="text-muted-foreground font-normal">
          {formatPeriod(event.period)} • {formatTime(event.gameSeconds)}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Shooter</span>
          <span className="font-medium">
            {event.shooterName ?? "Unknown"}
            {event.shooterPosition ? ` (${event.shooterPosition})` : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium">{event.shotType || "Shot"}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">xG</span>
          <span className="font-mono font-semibold">
            {(event.xGoal * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Location</span>
          <span className="font-medium">
            {event.shotDistance.toFixed(0)}ft @ {event.shotAngle.toFixed(0)}°
          </span>
        </div>

        {strength && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Strength</span>
            <span
              className={
                strength === "PP" ? "text-amber-500" : "text-sky-500"
              }
            >
              {strength}
            </span>
          </div>
        )}

        {(event.shotRebound || event.shotRush) && (
          <div className="pt-1 flex gap-2">
            {event.shotRebound && (
              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                Rebound
              </span>
            )}
            {event.shotRush && (
              <span className="bg-sky-500/20 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">
                Rush
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={`mt-2 pt-2 border-t text-xs font-semibold ${
          event.isGoal ? "text-success" : "text-muted-foreground"
        }`}
      >
        {getResultLabel(event)}
      </div>
    </div>
  );
}

export function ShotGoalTimelineChart({ shotsData }: ShotGoalTimelineChartProps) {
  const { homeEvents, awayEvents, maxTime } = useMemo(() => {
    const homeEvents: TimelineEvent[] = shotsData.homeShots.map((s, idx) => ({
      id: `home-${s.period}-${s.gameSeconds}-${idx}`,
      team: "home",
      teamCode: shotsData.homeTeamCode,
      period: s.period,
      gameSeconds: s.gameSeconds,
      y: -1,
      isGoal: s.isGoal,
      shotWasOnGoal: s.shotWasOnGoal,
      shotType: s.shotType,
      shooterName: s.shooterName,
      shooterPosition: s.shooterPosition,
      xGoal: s.xGoal,
      shotDistance: s.shotDistance,
      shotAngle: s.shotAngle,
      shotRebound: s.shotRebound,
      shotRush: s.shotRush,
      homeSkatersOnIce: s.homeSkatersOnIce,
      awaySkatersOnIce: s.awaySkatersOnIce,
    }));

    const awayEvents: TimelineEvent[] = shotsData.awayShots.map((s, idx) => ({
      id: `away-${s.period}-${s.gameSeconds}-${idx}`,
      team: "away",
      teamCode: shotsData.awayTeamCode,
      period: s.period,
      gameSeconds: s.gameSeconds,
      y: 1,
      isGoal: s.isGoal,
      shotWasOnGoal: s.shotWasOnGoal,
      shotType: s.shotType,
      shooterName: s.shooterName,
      shooterPosition: s.shooterPosition,
      xGoal: s.xGoal,
      shotDistance: s.shotDistance,
      shotAngle: s.shotAngle,
      shotRebound: s.shotRebound,
      shotRush: s.shotRush,
      homeSkatersOnIce: s.homeSkatersOnIce,
      awaySkatersOnIce: s.awaySkatersOnIce,
    }));

    const all = [...homeEvents, ...awayEvents];
    const maxTime = Math.max(3600, ...all.map((e) => e.gameSeconds), 0);

    return { homeEvents, awayEvents, maxTime };
  }, [shotsData]);

  const totalEvents = homeEvents.length + awayEvents.length;
  const homeGoals = shotsData.homeShots.filter((s) => s.isGoal).length;
  const awayGoals = shotsData.awayShots.filter((s) => s.isGoal).length;

  if (totalEvents === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shot & Goal Timeline</CardTitle>
          <CardDescription>No shot data available for this game</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const periodBreaks = [1200, 2400, 3600].filter((t) => t < maxTime);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Shot & Goal Timeline</CardTitle>
        <CardDescription>
          Diamonds indicate goals. Shot size scales with xG. Final:{" "}
          {shotsData.awayTeamCode} {awayGoals} - {homeGoals}{" "}
          {shotsData.homeTeamCode}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              vertical={false}
            />

            <XAxis
              dataKey="gameSeconds"
              type="number"
              domain={[0, maxTime]}
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
              dataKey="y"
              type="number"
              domain={[-1.6, 1.6]}
              ticks={[-1, 1]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) =>
                v === 1 ? shotsData.awayTeamCode : shotsData.homeTeamCode
              }
              width={42}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.25 }}
            />

            <ReferenceLine
              y={0}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeOpacity={0.35}
            />

            {periodBreaks.map((t) => (
              <ReferenceLine
                key={t}
                x={t}
                stroke={CHART_AXIS_COLOURS.reference}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            ))}

            <Scatter
              data={awayEvents}
              shape={<TimelineMarker />}
              name={shotsData.awayTeamCode}
            />
            <Scatter
              data={homeEvents}
              shape={<TimelineMarker />}
              name={shotsData.homeTeamCode}
            />
          </ScatterChart>
        </ResponsiveContainer>

        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
          aria-label="Timeline legend"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: SEMANTIC_COLOURS.primary, opacity: 0.7 }}
            />
            <span>{shotsData.homeTeamCode} shot</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: SEMANTIC_COLOURS.danger, opacity: 0.7 }}
            />
            <span>{shotsData.awayTeamCode} shot</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rotate-45"
              style={{ backgroundColor: "white", border: "1px solid #94a3b8" }}
            />
            <span>Goal (diamond)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShotGoalTimelineChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full h-56 rounded-lg" />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

