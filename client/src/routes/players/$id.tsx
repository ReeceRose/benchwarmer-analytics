import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Ruler, Weight, Target, Filter } from "lucide-react";
import { usePlayer, usePlayerStats, usePlayerShots, useTeams } from "@/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, BackButton } from "@/components/shared";
import {
  RinkVisualization,
  PlayerShotFilters,
  ShotSummaryCard,
  PeriodBreakdownCard,
} from "@/components/shot-explorer";
import type { DangerLevel } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatPosition,
  formatHeight,
  formatWeight,
  formatDate,
  formatToi,
  formatPercent,
  formatSeason,
} from "@/lib/formatters";
import type { SkaterStats, Team } from "@/types";

export const Route = createFileRoute("/players/$id")({
  component: PlayerDetailPage,
});

// Group stats by season and aggregate
interface SeasonRow {
  season: number;
  team: string;
  // Regular season stats
  gp: number;
  g: number;
  a: number;
  p: number;
  toi: number;
  shots: number;
  xg: number;
  cf: number | null;
  // Playoff stats (null if no playoffs)
  playoffGp: number | null;
  playoffG: number | null;
  playoffA: number | null;
  playoffP: number | null;
}

interface CareerTotals {
  gp: number;
  g: number;
  a: number;
  p: number;
  toi: number;
  shots: number;
  xg: number;
  playoffGp: number;
  playoffG: number;
  playoffA: number;
  playoffP: number;
}

function buildSeasonRows(stats: SkaterStats[], situation: string): SeasonRow[] {
  // Group by season and team
  const seasonTeamMap = new Map<string, { regular: SkaterStats[]; playoffs: SkaterStats[] }>();

  for (const stat of stats) {
    if (stat.situation !== situation) continue;

    const key = `${stat.season}-${stat.team}`;
    if (!seasonTeamMap.has(key)) {
      seasonTeamMap.set(key, { regular: [], playoffs: [] });
    }
    const group = seasonTeamMap.get(key)!;
    if (stat.isPlayoffs) {
      group.playoffs.push(stat);
    } else {
      group.regular.push(stat);
    }
  }

  const rows: SeasonRow[] = [];

  for (const [key, data] of seasonTeamMap.entries()) {
    const [seasonStr, team] = key.split("-");
    const season = parseInt(seasonStr, 10);

    // Aggregate regular season
    const reg = data.regular.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        g: acc.g + s.goals,
        a: acc.a + s.assists,
        p: acc.p + s.points,
        toi: acc.toi + s.iceTimeSeconds,
        shots: acc.shots + s.shots,
        xg: acc.xg + (s.expectedGoals ?? 0),
        cfSum: acc.cfSum + (s.corsiForPct ?? 0) * s.iceTimeSeconds,
        cfTime: acc.cfTime + (s.corsiForPct != null ? s.iceTimeSeconds : 0),
      }),
      { gp: 0, g: 0, a: 0, p: 0, toi: 0, shots: 0, xg: 0, cfSum: 0, cfTime: 0 }
    );

    // Aggregate playoffs
    const play = data.playoffs.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        g: acc.g + s.goals,
        a: acc.a + s.assists,
        p: acc.p + s.points,
      }),
      { gp: 0, g: 0, a: 0, p: 0 }
    );

    // Only add row if there's regular season data
    if (reg.gp > 0) {
      rows.push({
        season,
        team,
        gp: reg.gp,
        g: reg.g,
        a: reg.a,
        p: reg.p,
        toi: reg.toi,
        shots: reg.shots,
        xg: reg.xg,
        cf: reg.cfTime > 0 ? reg.cfSum / reg.cfTime : null,
        playoffGp: play.gp > 0 ? play.gp : null,
        playoffG: play.gp > 0 ? play.g : null,
        playoffA: play.gp > 0 ? play.a : null,
        playoffP: play.gp > 0 ? play.p : null,
      });
    }
  }

  // Sort by season descending
  return rows.sort((a, b) => b.season - a.season);
}

function calculateTotals(rows: SeasonRow[]): CareerTotals {
  return rows.reduce(
    (acc, row) => ({
      gp: acc.gp + row.gp,
      g: acc.g + row.g,
      a: acc.a + row.a,
      p: acc.p + row.p,
      toi: acc.toi + row.toi,
      shots: acc.shots + row.shots,
      xg: acc.xg + row.xg,
      playoffGp: acc.playoffGp + (row.playoffGp ?? 0),
      playoffG: acc.playoffG + (row.playoffG ?? 0),
      playoffA: acc.playoffA + (row.playoffA ?? 0),
      playoffP: acc.playoffP + (row.playoffP ?? 0),
    }),
    { gp: 0, g: 0, a: 0, p: 0, toi: 0, shots: 0, xg: 0, playoffGp: 0, playoffG: 0, playoffA: 0, playoffP: 0 }
  );
}

// Situation options for the filter
const SITUATIONS = [
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (Power Play)" },
  { value: "4on5", label: "4v5 (Penalty Kill)" },
  { value: "other", label: "Other" },
] as const;

function PlayerDetailPage() {
  const { id } = Route.useParams();
  const playerId = parseInt(id, 10);
  const [situation, setSituation] = useState("all");

  // Shot filter state
  const [shotSeason, setShotSeason] = useState<number | null>(null);
  const [shotPeriod, setShotPeriod] = useState<number | undefined>(undefined);
  const [shotType, setShotType] = useState<string | undefined>(undefined);
  const [goalsOnly, setGoalsOnly] = useState(false);
  const [shotLimit, setShotLimit] = useState<number | undefined>(250);
  const [dangerLevel, setDangerLevel] = useState<DangerLevel>("all");

  const { data: player, isLoading: playerLoading, error, refetch } = usePlayer(playerId);
  const { data: statsData, isLoading: statsLoading } = usePlayerStats(playerId);
  const { data: teamsData } = useTeams();

  // Get available situations from the data
  const availableSituations = useMemo(() => {
    const stats = statsData?.stats ?? [];
    const situations = new Set(stats.map((s) => s.situation));
    return SITUATIONS.filter((s) => situations.has(s.value));
  }, [statsData]);

  const allStats = useMemo(() => statsData?.stats ?? [], [statsData?.stats]);
  const seasonRows = useMemo(() => buildSeasonRows(allStats, situation), [allStats, situation]);
  const totals = useMemo(() => calculateTotals(seasonRows), [seasonRows]);
  const teams = teamsData?.teams;
  const hasPlayoffData = seasonRows.some((r) => r.playoffGp !== null);

  // Get available seasons from stats data for shot filter
  const availableSeasons = useMemo(() => {
    const seasons = new Set(allStats.map((s) => s.season));
    return Array.from(seasons).sort((a, b) => b - a);
  }, [allStats]);

  // Compute default season - use first available when shotSeason is null
  const effectiveShotSeason = shotSeason ?? availableSeasons[0] ?? null;

  // Only fetch shots when we have a valid season
  const { data: shotsData, isLoading: shotsLoading } = usePlayerShots(playerId, {
    season: effectiveShotSeason ?? undefined,
    period: shotPeriod,
    shotType,
    goalsOnly: goalsOnly || undefined,
    limit: shotLimit,
  });

  // Filter shots by danger level client-side
  const shots = shotsData?.shots;
  const filteredShots = useMemo(() => {
    if (!shots) return [];

    return shots.filter((shot) => {
      const xg = shot.xGoal ?? 0;
      switch (dangerLevel) {
        case "high":
          return xg > 0.15;
        case "medium-high":
          return xg >= 0.06;
        case "low":
          return xg < 0.06;
        default:
          return true;
      }
    });
  }, [shots, dangerLevel]);

  if (error) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Player not found"
          message="Could not find this player. They may not exist or the server may be unavailable."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const initials = player?.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2);

  // Helper to get team name
  const getTeamName = (abbrev: string): string => {
    const team = teams?.find((t: Team) => t.abbreviation === abbrev);
    return team?.name ?? abbrev;
  };

  return (
    <div className="container py-8">
      <BackButton fallbackPath="/players" label="Players" />

      {/* Player Header */}
      {playerLoading ? (
        <div className="flex gap-6 mb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={player?.headshotUrl} alt={player?.name} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{player?.name}</h1>
              {player?.position && (
                <Badge variant="secondary">{formatPosition(player.position)}</Badge>
              )}
            </div>
            {player?.currentTeamAbbreviation && (
              <Link
                to="/teams/$abbrev"
                params={{ abbrev: player.currentTeamAbbreviation }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {getTeamName(player.currentTeamAbbreviation)}
              </Link>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              {player?.birthDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(player.birthDate)}</span>
                </div>
              )}
              {player?.heightInches && (
                <div className="flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5" />
                  <span>{formatHeight(player.heightInches)}</span>
                </div>
              )}
              {player?.weightLbs && (
                <div className="flex items-center gap-1.5">
                  <Weight className="h-3.5 w-3.5" />
                  <span>{formatWeight(player.weightLbs)}</span>
                </div>
              )}
              {player?.shoots && (
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  <span>Shoots {player.shoots}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Career Statistics</h2>
        {availableSituations.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={situation} onValueChange={setSituation}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSituations.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Table */}
      {statsLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : seasonRows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <p className="font-medium">No statistics available</p>
          <p className="text-sm mt-1">This player may not have NHL stats recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Season</TableHead>
                <TableHead className="font-semibold">Team</TableHead>
                <TableHead className="text-right font-semibold">GP</TableHead>
                <TableHead className="text-right font-semibold">G</TableHead>
                <TableHead className="text-right font-semibold">A</TableHead>
                <TableHead className="text-right font-semibold">P</TableHead>
                <TableHead className="text-right font-semibold hidden md:table-cell">TOI</TableHead>
                <TableHead className="text-right font-semibold hidden md:table-cell">S</TableHead>
                <TableHead className="text-right font-semibold hidden lg:table-cell">xG</TableHead>
                <TableHead className="text-right font-semibold hidden lg:table-cell">CF%</TableHead>
                {hasPlayoffData && (
                  <>
                    <TableHead className="text-right font-semibold border-l">GP</TableHead>
                    <TableHead className="text-right font-semibold">G</TableHead>
                    <TableHead className="text-right font-semibold">A</TableHead>
                    <TableHead className="text-right font-semibold">P</TableHead>
                  </>
                )}
              </TableRow>
              {hasPlayoffData && (
                <TableRow className="bg-muted/30">
                  <TableHead colSpan={6} className="text-xs text-muted-foreground py-1">Regular Season</TableHead>
                  <TableHead colSpan={4} className="text-xs text-muted-foreground py-1 hidden md:table-cell" />
                  <TableHead colSpan={4} className="text-xs text-muted-foreground py-1 border-l">Playoffs</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {seasonRows.map((row) => (
                <TableRow key={`${row.season}-${row.team}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{formatSeason(row.season)}</TableCell>
                  <TableCell>
                    <Link
                      to="/teams/$abbrev"
                      params={{ abbrev: row.team }}
                      className="hover:underline"
                    >
                      {row.team}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.gp}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.g}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.a}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.p}</TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(row.toi)}</TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">{row.shots}</TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">{row.xg.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">
                    {row.cf != null ? formatPercent(row.cf, false) : "-"}
                  </TableCell>
                  {hasPlayoffData && (
                    <>
                      <TableCell className="text-right tabular-nums border-l">{row.playoffGp ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.playoffG ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.playoffA ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.playoffP ?? "-"}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell>Totals</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right tabular-nums">{totals.gp}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.g}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.a}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.p}</TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(totals.toi)}</TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">{totals.shots}</TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell">{totals.xg.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell">-</TableCell>
                {hasPlayoffData && (
                  <>
                    <TableCell className="text-right tabular-nums border-l">{totals.playoffGp || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{totals.playoffG || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{totals.playoffA || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{totals.playoffP || "-"}</TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Shot Map */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shot Map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {effectiveShotSeason !== null ? (
            <>
              {/* Filters */}
              <PlayerShotFilters
                season={effectiveShotSeason}
                onSeasonChange={setShotSeason}
                availableSeasons={availableSeasons}
                period={shotPeriod}
                onPeriodChange={setShotPeriod}
                shotType={shotType}
                onShotTypeChange={setShotType}
                goalsOnly={goalsOnly}
                onGoalsOnlyChange={setGoalsOnly}
                limit={shotLimit}
                onLimitChange={setShotLimit}
                dangerLevel={dangerLevel}
                onDangerLevelChange={setDangerLevel}
              />

              {shotsLoading ? (
                <Skeleton className="h-75 w-full" />
              ) : filteredShots.length > 0 ? (
                <div className="space-y-4">
                  <RinkVisualization shots={filteredShots} showLegend />
                  {shotsData?.summary && <ShotSummaryCard summary={shotsData.summary} />}
                  <PeriodBreakdownCard shots={filteredShots} />
                  <p className="text-sm text-muted-foreground text-center">
                    Showing {filteredShots.length} shots
                    {dangerLevel !== "all" && ` (${dangerLevel} danger)`}
                    {shotLimit && shotsData && shotsData.shots.length >= shotLimit && ` - limited to ${shotLimit}`}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No shot data available for {effectiveShotSeason}-{effectiveShotSeason + 1}.</p>
                  <p className="text-sm mt-1">Try adjusting your filters or selecting a different season.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-75">
              <Skeleton className="h-75 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
