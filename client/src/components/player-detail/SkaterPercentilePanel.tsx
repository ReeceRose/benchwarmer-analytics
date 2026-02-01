import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSeasonPercentiles } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SkaterStats } from "@/types";

function calculatePercentile(value: number, thresholds: number[]): number | null {
  if (!Number.isFinite(value) || thresholds.length === 0) return null;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1;
  }
  return 1;
}

function getPercentileColor(pctl: number | null): string {
  if (pctl == null) return "text-muted-foreground";
  if (pctl >= 90) return "text-success";
  if (pctl >= 75) return "text-success";
  if (pctl >= 50) return "text-foreground";
  if (pctl >= 25) return "text-warning";
  return "text-error";
}

function getPercentileBarClass(pctl: number | null): string {
  if (pctl == null) return "bg-muted";
  if (pctl >= 75) return "bg-success/70";
  if (pctl >= 50) return "bg-primary/70";
  if (pctl >= 25) return "bg-warning/70";
  return "bg-error/70";
}

function aggregateSeasonAll(stats: SkaterStats[], season: number): {
  gp: number;
  goals: number;
  assists: number;
  points: number;
  iceTimeSeconds: number;
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
    }),
    { gp: 0, goals: 0, assists: 0, points: 0, iceTimeSeconds: 0 }
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

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "season-percentiles", season],
    queryFn: () => getSeasonPercentiles(season),
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

    const ppgPctl =
      ppg != null && data?.pointsPerGame ? calculatePercentile(ppg, data.pointsPerGame) : null;
    const gpgPctl =
      gpg != null && data?.goalsPerGame ? calculatePercentile(gpg, data.goalsPerGame) : null;
    const pp60Pctl =
      pp60 != null && data?.pointsPer60 ? calculatePercentile(pp60, data.pointsPer60) : null;
    const gp60Pctl =
      gp60 != null && data?.goalsPer60 ? calculatePercentile(gp60, data.goalsPer60) : null;

    return [
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
        <CardTitle className="text-base">Percentiles (Season)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((m) => {
            const p = m.pctl;
            const widthPct = p != null ? Math.max(1, Math.min(99, p)) : 0;
            return (
              <div key={m.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className={cn("text-sm font-semibold tabular-nums", getPercentileColor(p))}>
                    {isLoading ? "…" : p != null ? `P${p}` : "-"}
                  </div>
                </div>

                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("absolute inset-y-0 left-0", getPercentileBarClass(p))}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {m.value != null ? m.value.toFixed(2) : "-"}
                  </span>
                  <span />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Percentiles are vs the league in this season (min games default).
        </p>
      </CardContent>
    </Card>
  );
}

