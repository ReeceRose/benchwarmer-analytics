import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SegmentedControl } from "@/components/layout";
import { TeamHeading } from "@/components/game-preview/TeamHeading";
import { RinkVisualization, ShotMapLegend } from "@/components/shot-explorer";
import { periodName } from "@/components/game-live/live-utils";
import { getDangerZoneFromXg } from "@/lib/danger-zones";
import { cn } from "@/lib/utils";
import type { GameShot, GameShotsResponse, Shot } from "@/types";

interface GameShotMapProps {
  shotsData: GameShotsResponse;
}

/** The game endpoint's shots in the shape the shared shot map draws. */
function toShots(shots: GameShot[], team: string): Shot[] {
  return shots.map((s, i) => ({
    shotId: `${team}-${s.period}-${s.gameSeconds}-${i}`,
    shooterPlayerId: s.shooterPlayerId ?? undefined,
    shooterName: s.shooterName ?? undefined,
    shooterPosition: s.shooterPosition ?? undefined,
    period: s.period,
    gameTimeSeconds: s.gameSeconds,
    arenaAdjustedXCoord: s.xCoord,
    arenaAdjustedYCoord: s.yCoord,
    shotDistance: s.shotDistance,
    shotAngle: s.shotAngle,
    shotType: s.shotType ?? undefined,
    isGoal: s.isGoal,
    shotWasOnGoal: s.shotWasOnGoal,
    shotOnEmptyNet: false,
    shotRebound: s.shotRebound,
    shotRush: s.shotRush,
    xGoal: s.xGoal,
    homeSkatersOnIce: s.homeSkatersOnIce,
    awaySkatersOnIce: s.awaySkatersOnIce,
    gameId: "",
  }));
}

function totals(shots: GameShot[]) {
  return {
    shots: shots.length,
    goals: shots.filter((s) => s.isGoal).length,
    xg: shots.reduce((sum, s) => sum + s.xGoal, 0),
    highDanger: shots.filter((s) => getDangerZoneFromXg(s.xGoal) === "high").length,
  };
}

function TeamRink({ team, shots }: { team: string; shots: GameShot[] }) {
  const t = totals(shots);
  const mapped = toShots(shots, team);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <TeamHeading team={team} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {t.shots} shots · {t.goals} G · {t.xg.toFixed(2)} xG · {t.highDanger} high danger
        </span>
      </div>
      <RinkVisualization shots={mapped} showLegend={false} teamAbbreviation={team} className="max-w-none" />
    </div>
  );
}

/** Each team's unblocked shots on the zone it attacked, away on the left. */
export function GameShotMap({ shotsData }: GameShotMapProps) {
  const [period, setPeriod] = useState("all");
  const { awayShots, homeShots, awayTeamCode, homeTeamCode } = shotsData;

  const periods = useMemo(
    () => [...new Set([...homeShots, ...awayShots].map((s) => s.period))].sort((a, b) => a - b),
    [homeShots, awayShots],
  );
  // Filtered once per period change so the rinks keep stable inputs while hovering.
  const [away, home] = useMemo(() => {
    const keep = (shots: GameShot[]) => (period === "all" ? shots : shots.filter((s) => String(s.period) === period));
    return [keep(awayShots), keep(homeShots)];
  }, [awayShots, homeShots, period]);

  if (homeShots.length + awayShots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shot map</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState className="border-0 py-8" title="No shot data for this game" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Shot map</CardTitle>
          <SegmentedControl
            aria-label="Period"
            value={period}
            onValueChange={setPeriod}
            options={[
              { value: "all", label: "All" },
              ...periods.map((p) => ({ value: String(p), label: periodName(p) })),
            ]}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 md:grid-cols-2">
          <TeamRink team={awayTeamCode} shots={away} />
          <TeamRink team={homeTeamCode} shots={home} />
        </div>
        <ShotMapLegend />

        <div className="overflow-x-auto border-t pt-4">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr>
                <th className="pb-1 text-left">Period</th>
                <th className="pb-1 text-center" colSpan={2}>Shots</th>
                <th className="pb-1 text-center" colSpan={2}>Goals</th>
                <th className="pb-1 text-center" colSpan={2}>xG</th>
              </tr>
              <tr className="text-xs">
                <th />
                {[0, 1, 2].map((i) => (
                  <PairHeader key={i} away={awayTeamCode} home={homeTeamCode} />
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <PeriodRow
                  key={p}
                  label={periodName(p)}
                  away={totals(awayShots.filter((s) => s.period === p))}
                  home={totals(homeShots.filter((s) => s.period === p))}
                />
              ))}
              <PeriodRow label="Total" away={totals(awayShots)} home={totals(homeShots)} total />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PairHeader({ away, home }: { away: string; home: string }) {
  return (
    <>
      <th className="pb-1.5 pl-3 text-right font-normal">{away}</th>
      <th className="pb-1.5 pl-3 text-right font-normal">{home}</th>
    </>
  );
}

function PeriodRow({
  label,
  away,
  home,
  total = false,
}: {
  label: string;
  away: ReturnType<typeof totals>;
  home: ReturnType<typeof totals>;
  total?: boolean;
}) {
  // Bold marks the side that won the column, so the table reads at a glance.
  const cell = (a: number, h: number, side: "away" | "home", text: string) => (
    <td className={cn("py-1.5 pl-3 text-right", (side === "away" ? a > h : h > a) && "font-semibold")}>{text}</td>
  );
  return (
    <tr className={total ? "border-t" : undefined}>
      <td className={cn("py-1.5", total && "font-medium")}>{label}</td>
      {cell(away.shots, home.shots, "away", String(away.shots))}
      {cell(away.shots, home.shots, "home", String(home.shots))}
      {cell(away.goals, home.goals, "away", String(away.goals))}
      {cell(away.goals, home.goals, "home", String(home.goals))}
      {cell(away.xg, home.xg, "away", away.xg.toFixed(2))}
      {cell(away.xg, home.xg, "home", home.xg.toFixed(2))}
    </tr>
  );
}

export function GameShotMapSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-56 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="aspect-101/86 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
