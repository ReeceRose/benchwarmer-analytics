import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSeasonMinGames } from "@/hooks";
import { getSeasonPercentiles } from "@/lib/api";
import { formatOrdinal } from "@/lib/formatters";
import { getPercentileBarClass, getPercentileColour } from "@/lib/stat-colours";
import { cn } from "@/lib/utils";
import type { SkaterStats } from "@/types";

const MIN_GAMES_OPTIONS = [1, 3, 5, 10, 15, 20] as const;

function calculatePercentile(value: number, thresholds: number[]): number | null {
  if (!Number.isFinite(value) || thresholds.length === 0) return null;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1;
  }
  return 1;
}

function aggregateSeasonAll(stats: SkaterStats[], season: number): {
  gp: number;
  goals: number;
  assists: number;
  points: number;
  iceTimeSeconds: number;
  gameScore: number | null;
} | null {
  const seasonStats = stats.filter(
    (s) => !s.isPlayoffs && s.situation === "all" && s.season === season
  );
  if (seasonStats.length === 0) return null;

  return seasonStats.reduce(
    (acc, s) => ({
      gp: acc.gp + s.gamesPlayed,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      points: acc.points + s.points,
      iceTimeSeconds: acc.iceTimeSeconds + s.iceTimeSeconds,
      gameScore: s.gameScore == null ? acc.gameScore : (acc.gameScore ?? 0) + s.gameScore,
    }),
    { gp: 0, goals: 0, assists: 0, points: 0, iceTimeSeconds: 0, gameScore: null as number | null }
  );
}

export function SkaterPercentilePanel({
  stats,
  season,
}: {
  stats: SkaterStats[];
  season: number;
}) {
  const seasonAgg = useMemo(() => aggregateSeasonAll(stats, season), [stats, season]);
  const minGames = useSeasonMinGames(season, 20, MIN_GAMES_OPTIONS);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "season-percentiles", season, minGames],
    queryFn: () => getSeasonPercentiles(season, minGames),
    staleTime: 1000 * 60 * 30,
  });

  const metrics = useMemo(() => {
    if (!seasonAgg) return [];

    const gp = seasonAgg.gp;
    const hours = seasonAgg.iceTimeSeconds / 3600;

    const ppg = gp > 0 ? seasonAgg.points / gp : null;
    const gpg = gp > 0 ? seasonAgg.goals / gp : null;
    const pp60 = hours > 0 ? seasonAgg.points / hours : null;
    const gp60 = hours > 0 ? seasonAgg.goals / hours : null;
    const gsPerGame = gp > 0 && seasonAgg.gameScore != null ? seasonAgg.gameScore / gp : null;

    const ppgPctl =
      ppg != null && data?.pointsPerGame ? calculatePercentile(ppg, data.pointsPerGame) : null;
    const gpgPctl =
      gpg != null && data?.goalsPerGame ? calculatePercentile(gpg, data.goalsPerGame) : null;
    const pp60Pctl =
      pp60 != null && data?.pointsPer60 ? calculatePercentile(pp60, data.pointsPer60) : null;
    const gp60Pctl =
      gp60 != null && data?.goalsPer60 ? calculatePercentile(gp60, data.goalsPer60) : null;
    const gsPctl =
      gsPerGame != null && data?.gameScorePerGame
        ? calculatePercentile(gsPerGame, data.gameScorePerGame)
        : null;

    return [
      { key: "gs", label: "Game Score/GP", value: gsPerGame, pctl: gsPctl },
      { key: "ppg", label: "Points/GP", value: ppg, pctl: ppgPctl },
      { key: "gpg", label: "Goals/GP", value: gpg, pctl: gpgPctl },
      { key: "pp60", label: "Points/60", value: pp60, pctl: pp60Pctl },
      { key: "gp60", label: "Goals/60", value: gp60, pctl: gp60Pctl },
    ] as const;
  }, [seasonAgg, data]);

  if (!seasonAgg) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">League percentiles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {metrics.map((m) => {
            const p = m.pctl;
            const widthPct = p != null ? Math.max(2, Math.min(100, p)) : 0;
            return (
              <div key={m.key} className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {m.value != null ? m.value.toFixed(2) : "–"}
                  </span>
                  <span
                    className={cn(
                      "ml-auto font-display text-lg font-bold tabular-nums",
                      getPercentileColour(p),
                    )}
                  >
                    {isLoading ? "…" : p != null ? formatOrdinal(p) : "–"}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-[width]",
                      getPercentileBarClass(p),
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/20" />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Percentile among skaters with at least {minGames}{" "}
          {minGames === 1 ? "game" : "games"} this season. The tick marks the
          league median.
        </p>
      </CardContent>
    </Card>
  );
}

