import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RINK_COLOURS, getShotColour } from "@/lib/chart-colours";
import type { GameShotsResponse, GameShot } from "@/types";

interface GameShotMapProps {
  shotsData: GameShotsResponse;
}

// NHL rink dimensions (in feet)
const RINK_LENGTH = 100;
const RINK_HEIGHT = 85;
const GOAL_LINE_X = 11;
const BLUE_LINE_X = 75;
const CREASE_DEPTH = 6;
const CREASE_WIDTH = 8;
const FACEOFF_CIRCLE_RADIUS = 15;
const FACEOFF_DOT_RADIUS = 1;
const FACEOFF_X = 31;
const FACEOFF_Y_OFFSET = 22;

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

function getStrengthLabel(home: number, away: number, isHomeTeam: boolean): string | null {
  const shooterSkaters = isHomeTeam ? home : away;
  const defenderSkaters = isHomeTeam ? away : home;

  if (shooterSkaters === defenderSkaters) return null; // Even strength
  if (shooterSkaters > defenderSkaters) return "PP";
  return "SH";
}

function ShotTooltip({ shot, isHomeTeam }: { shot: GameShot; isHomeTeam: boolean }) {
  const strength = getStrengthLabel(shot.homeSkatersOnIce, shot.awaySkatersOnIce, isHomeTeam);

  return (
    <div className="space-y-1 text-sm">
      <div className="font-semibold flex items-center gap-2">
        {shot.shooterName || "Unknown"}
        {shot.shooterPosition && (
          <span className="text-muted-foreground font-normal">({shot.shooterPosition})</span>
        )}
      </div>
      <div className="flex gap-3 text-muted-foreground">
        <span>{formatPeriod(shot.period)}</span>
        <span>{formatTime(shot.gameSeconds)}</span>
        <span>{shot.shotType || "Shot"}</span>
        {strength && (
          <span className={strength === "PP" ? "text-amber-500" : "text-sky-500"}>
            {strength}
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <span>
          xG: <span className="font-medium">{(shot.xGoal * 100).toFixed(1)}%</span>
        </span>
        <span>
          {shot.shotDistance.toFixed(0)}ft @ {shot.shotAngle.toFixed(0)}°
        </span>
      </div>
      {shot.goalieName && (
        <div className="text-muted-foreground">
          vs {shot.goalieName}
        </div>
      )}
      <div
        className={`font-semibold ${shot.isGoal ? "text-success" : "text-muted-foreground"}`}
      >
        {shot.isGoal ? "GOAL" : shot.shotWasOnGoal ? "Save" : "Missed"}
      </div>
      {(shot.shotRebound || shot.shotRush) && (
        <div className="flex gap-2 text-xs">
          {shot.shotRebound && (
            <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              Rebound
            </span>
          )}
          {shot.shotRush && (
            <span className="bg-sky-500/20 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">
              Rush
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HalfRink({
  shots,
  teamCode,
  width,
  isHomeTeam,
}: {
  shots: GameShot[];
  teamCode: string;
  width: number;
  isHomeTeam: boolean;
}) {
  const height = Math.round(width * (RINK_HEIGHT / RINK_LENGTH));

  const transformedShots = useMemo(() => {
    return shots.map((shot) => {
      // Transform coordinates
      const rawX = Math.abs(shot.xCoord);
      const rawY = shot.yCoord;

      const clampedX = Math.min(Math.max(rawX, 0), 100);
      const svgX = GOAL_LINE_X + ((89 - clampedX) / 89) * (RINK_LENGTH - GOAL_LINE_X);

      const clampedY = Math.min(Math.max(rawY, -42.5), 42.5);
      const svgY = clampedY + 42.5;

      const color = getShotColour(shot.isGoal, shot.xGoal);
      const size = Math.max(1.5, Math.min(4, 1.5 + shot.xGoal * 12));

      return { shot, x: svgX, y: svgY, color, size };
    });
  }, [shots]);

  const summary = useMemo(() => {
    const goals = shots.filter((s) => s.isGoal).length;
    const totalXG = shots.reduce((sum, s) => sum + s.xGoal, 0);
    const highDanger = shots.filter((s) => s.xGoal >= 0.15).length;
    return { total: shots.length, goals, totalXG, highDanger };
  }, [shots]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium mb-2">{teamCode}</div>
      <svg
        viewBox={`0 0 ${RINK_LENGTH} ${RINK_HEIGHT}`}
        width={width}
        height={height}
        className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-border"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id={`goal-glow-${teamCode}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={`
            M ${RINK_LENGTH} 0
            L 10 0
            Q 0 0 0 10
            L 0 ${RINK_HEIGHT - 10}
            Q 0 ${RINK_HEIGHT} 10 ${RINK_HEIGHT}
            L ${RINK_LENGTH} ${RINK_HEIGHT}
            L ${RINK_LENGTH} 0
            Z
          `}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-slate-300 dark:text-slate-700"
        />

        <path
          d={`
            M ${RINK_LENGTH - 1} 1
            L 10 1
            Q 1 1 1 10
            L 1 ${RINK_HEIGHT - 10}
            Q 1 ${RINK_HEIGHT - 1} 10 ${RINK_HEIGHT - 1}
            L ${RINK_LENGTH - 1} ${RINK_HEIGHT - 1}
            L ${RINK_LENGTH - 1} 1
            Z
          `}
          fill="white"
          className="dark:fill-slate-800"
        />

        <line
          x1={GOAL_LINE_X}
          y1="0"
          x2={GOAL_LINE_X}
          y2={RINK_HEIGHT}
          stroke={RINK_COLOURS.goalLine}
          strokeWidth="0.5"
        />

        <line
          x1={BLUE_LINE_X}
          y1="0"
          x2={BLUE_LINE_X}
          y2={RINK_HEIGHT}
          stroke={RINK_COLOURS.blueLine}
          strokeWidth="1"
        />

        <rect
          x={GOAL_LINE_X}
          y={RINK_HEIGHT / 2 - CREASE_WIDTH / 2}
          width={CREASE_DEPTH}
          height={CREASE_WIDTH}
          fill={RINK_COLOURS.creaseFill}
          fillOpacity="0.3"
          stroke={RINK_COLOURS.goalLine}
          strokeWidth="0.3"
          rx="1"
        />

        <rect
          x={GOAL_LINE_X - 4}
          y={RINK_HEIGHT / 2 - 3}
          width="4"
          height="6"
          fill="none"
          stroke={RINK_COLOURS.goalLine}
          strokeWidth="0.5"
        />

        <circle
          cx={FACEOFF_X}
          cy={RINK_HEIGHT / 2 - FACEOFF_Y_OFFSET}
          r={FACEOFF_CIRCLE_RADIUS}
          fill="none"
          stroke={RINK_COLOURS.goalLine}
          strokeWidth="0.3"
        />
        <circle
          cx={FACEOFF_X}
          cy={RINK_HEIGHT / 2 - FACEOFF_Y_OFFSET}
          r={FACEOFF_DOT_RADIUS}
          fill={RINK_COLOURS.goalLine}
        />
        <circle
          cx={FACEOFF_X}
          cy={RINK_HEIGHT / 2 + FACEOFF_Y_OFFSET}
          r={FACEOFF_CIRCLE_RADIUS}
          fill="none"
          stroke={RINK_COLOURS.goalLine}
          strokeWidth="0.3"
        />
        <circle
          cx={FACEOFF_X}
          cy={RINK_HEIGHT / 2 + FACEOFF_Y_OFFSET}
          r={FACEOFF_DOT_RADIUS}
          fill={RINK_COLOURS.goalLine}
        />

        {transformedShots
          .filter(({ shot }) => !shot.isGoal)
          .map(({ shot, x, y, color, size }, idx) => (
            <Tooltip key={`${shot.period}-${shot.gameSeconds}-${idx}`}>
              <TooltipTrigger asChild>
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={color}
                  fillOpacity={0.7}
                  className="cursor-pointer transition-all hover:opacity-100"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <ShotTooltip shot={shot} isHomeTeam={isHomeTeam} />
              </TooltipContent>
            </Tooltip>
          ))}

        {transformedShots
          .filter(({ shot }) => shot.isGoal)
          .map(({ shot, x, y, color, size }, idx) => (
            <Tooltip key={`goal-${shot.period}-${shot.gameSeconds}-${idx}`}>
              <TooltipTrigger asChild>
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={color}
                  fillOpacity={1}
                  stroke="white"
                  strokeWidth={1}
                  filter={`url(#goal-glow-${teamCode})`}
                  className="cursor-pointer transition-all hover:opacity-100"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <ShotTooltip shot={shot} isHomeTeam={isHomeTeam} />
              </TooltipContent>
            </Tooltip>
          ))}
      </svg>

      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Shots: <span className="font-medium text-foreground">{summary.total}</span></span>
        <span>Goals: <span className="font-medium text-foreground">{summary.goals}</span></span>
        <span>xG: <span className="font-medium text-foreground">{summary.totalXG.toFixed(2)}</span></span>
        <span>HD: <span className="font-medium text-foreground">{summary.highDanger}</span></span>
      </div>
    </div>
  );
}

export function GameShotMap({ shotsData }: GameShotMapProps) {
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Get unique periods from the data
  const periods = useMemo(() => {
    const allPeriods = new Set<number>();
    [...shotsData.homeShots, ...shotsData.awayShots].forEach((s) =>
      allPeriods.add(s.period)
    );
    return Array.from(allPeriods).sort((a, b) => a - b);
  }, [shotsData]);

  // Filter shots by period
  const filteredHomeShots = useMemo(() => {
    if (periodFilter === "all") return shotsData.homeShots;
    return shotsData.homeShots.filter((s) => s.period === parseInt(periodFilter));
  }, [shotsData.homeShots, periodFilter]);

  const filteredAwayShots = useMemo(() => {
    if (periodFilter === "all") return shotsData.awayShots;
    return shotsData.awayShots.filter((s) => s.period === parseInt(periodFilter));
  }, [shotsData.awayShots, periodFilter]);

  const totalShots = shotsData.homeShots.length + shotsData.awayShots.length;

  if (totalShots === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shot Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No shot data available for this game.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Shot Map</CardTitle>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p.toString()}>
                  {formatPeriod(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HalfRink
            shots={filteredAwayShots}
            teamCode={shotsData.awayTeamCode}
            width={280}
            isHomeTeam={false}
          />
          <HalfRink
            shots={filteredHomeShots}
            teamCode={shotsData.homeTeamCode}
            width={280}
            isHomeTeam={true}
          />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Period Breakdown</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="py-1 pr-4">Period</th>
                  <th className="py-1 px-2 text-center" colSpan={2}>Shots</th>
                  <th className="py-1 px-2 text-center" colSpan={2}>Goals</th>
                  <th className="py-1 px-2 text-center" colSpan={2}>xG</th>
                </tr>
                <tr className="text-xs text-muted-foreground border-b">
                  <th></th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.awayTeamCode}</th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.homeTeamCode}</th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.awayTeamCode}</th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.homeTeamCode}</th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.awayTeamCode}</th>
                  <th className="py-1 px-2 text-center font-normal">{shotsData.homeTeamCode}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const awayPeriodShots = shotsData.awayShots.filter((s) => s.period === p);
                  const homePeriodShots = shotsData.homeShots.filter((s) => s.period === p);
                  const awayGoals = awayPeriodShots.filter((s) => s.isGoal).length;
                  const homeGoals = homePeriodShots.filter((s) => s.isGoal).length;
                  const awayXG = awayPeriodShots.reduce((sum, s) => sum + s.xGoal, 0);
                  const homeXG = homePeriodShots.reduce((sum, s) => sum + s.xGoal, 0);
                  return (
                    <tr key={p} className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-medium">{formatPeriod(p)}</td>
                      <td className="py-1.5 px-2 text-center">{awayPeriodShots.length}</td>
                      <td className="py-1.5 px-2 text-center">{homePeriodShots.length}</td>
                      <td className="py-1.5 px-2 text-center">{awayGoals}</td>
                      <td className="py-1.5 px-2 text-center">{homeGoals}</td>
                      <td className="py-1.5 px-2 text-center">{awayXG.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-center">{homeXG.toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr className="font-medium">
                  <td className="py-1.5 pr-4">Total</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.awayShots.length}</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.homeShots.length}</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.awayShots.filter((s) => s.isGoal).length}</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.homeShots.filter((s) => s.isGoal).length}</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.awayShots.reduce((sum, s) => sum + s.xGoal, 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-center">{shotsData.homeShots.reduce((sum, s) => sum + s.xGoal, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success ring-2 ring-white" />
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error" />
            <span>High Danger (&gt;15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Medium (6-15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cold" />
            <span>Low (&lt;6%)</span>
          </div>
          <div className="text-xs ml-auto">Dot size = xG probability</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GameShotMapSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="w-72 h-60 rounded-lg" />
            <div className="mt-2 flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="w-72 h-60 rounded-lg" />
            <div className="mt-2 flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
