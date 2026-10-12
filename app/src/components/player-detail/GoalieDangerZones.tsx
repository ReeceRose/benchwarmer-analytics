import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GoalieStats } from "@/types";

interface GoalieDangerZonesProps {
  stats: GoalieStats[];
  leagueAverages?: {
    lowDanger: number;
    mediumDanger: number;
    highDanger: number;
  };
  className?: string;
}

// Fallback baselines if league averages aren't provided by the API.
// MoneyPuck defines danger zones by xG probability:
// Low (<0.08), Medium (>=0.08 and <0.20), High (>=0.20).
const DEFAULT_LEAGUE_AVERAGES = {
  lowDanger: 0.965,
  mediumDanger: 0.915,
  highDanger: 0.865,
};

interface DangerZoneData {
  zone: string;
  shots: number;
  goals: number;
  saves: number;
  savePct: number | null;
  leagueAvg: number;
  difference: number | null;
}

function calculateDangerZoneStats(stats: GoalieStats[]): DangerZoneData[] {
  // Aggregate all stats (typically filter to 5on5 or all situations already applied)
  const totals = stats.reduce(
    (acc, s) => ({
      lowShots: acc.lowShots + s.lowDangerShots,
      lowGoals: acc.lowGoals + s.lowDangerGoals,
      medShots: acc.medShots + s.mediumDangerShots,
      medGoals: acc.medGoals + s.mediumDangerGoals,
      highShots: acc.highShots + s.highDangerShots,
      highGoals: acc.highGoals + s.highDangerGoals,
    }),
    {
      lowShots: 0,
      lowGoals: 0,
      medShots: 0,
      medGoals: 0,
      highShots: 0,
      highGoals: 0,
    },
  );

  const calcSavePct = (shots: number, goals: number): number | null => {
    if (shots === 0) return null;
    return (shots - goals) / shots;
  };

  const lowSvPct = calcSavePct(totals.lowShots, totals.lowGoals);
  const medSvPct = calcSavePct(totals.medShots, totals.medGoals);
  const highSvPct = calcSavePct(totals.highShots, totals.highGoals);

  return [
    {
      zone: "Low danger",
      shots: totals.lowShots,
      goals: totals.lowGoals,
      saves: totals.lowShots - totals.lowGoals,
      savePct: lowSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.lowDanger,
      difference:
        lowSvPct !== null ? lowSvPct - DEFAULT_LEAGUE_AVERAGES.lowDanger : null,
    },
    {
      zone: "Medium danger",
      shots: totals.medShots,
      goals: totals.medGoals,
      saves: totals.medShots - totals.medGoals,
      savePct: medSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.mediumDanger,
      difference:
        medSvPct !== null
          ? medSvPct - DEFAULT_LEAGUE_AVERAGES.mediumDanger
          : null,
    },
    {
      zone: "High danger",
      shots: totals.highShots,
      goals: totals.highGoals,
      saves: totals.highShots - totals.highGoals,
      savePct: highSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.highDanger,
      difference:
        highSvPct !== null
          ? highSvPct - DEFAULT_LEAGUE_AVERAGES.highDanger
          : null,
    },
  ];
}

function formatPct(value: number | null): string {
  if (value === null) return "–";
  return (value * 100).toFixed(1) + "%";
}

function formatDiff(value: number | null): string {
  if (value === null) return "–";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return sign + pct.toFixed(1);
}

// The difference bar runs from -SCALE to +SCALE save-percentage points.
const SCALE = 5;

/** Save % by shot danger, each against the league average for that danger level. */
export function GoalieDangerZones({ stats, leagueAverages, className }: GoalieDangerZonesProps) {
  if (stats.length === 0) {
    return null;
  }

  const zones = calculateDangerZoneStats(stats).map((d) => {
    const leagueAvg =
      d.zone === "Low danger"
        ? leagueAverages?.lowDanger
        : d.zone === "Medium danger"
          ? leagueAverages?.mediumDanger
          : leagueAverages?.highDanger;
    if (leagueAvg == null) return d;
    return {
      ...d,
      leagueAvg,
      difference: d.savePct !== null ? d.savePct - leagueAvg : null,
    };
  });

  if (!zones.some((d) => d.savePct !== null)) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Save % by shot danger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {zones.map((d) => {
          const pts = d.difference !== null ? d.difference * 100 : null;
          const width = pts !== null ? Math.min(Math.abs(pts), SCALE) / SCALE * 50 : 0;
          return (
            <div key={d.zone}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{d.zone}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {d.shots.toLocaleString()} shots · league {formatPct(d.leagueAvg)}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-[4rem_1fr_3.5rem] items-center gap-3">
                <span className="font-display text-xl font-bold tabular-nums">{formatPct(d.savePct)}</span>
                <div className="relative h-2.5 rounded-full bg-muted">
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-foreground/40" />
                  {pts !== null && (
                    <span
                      className={cn(
                        "absolute inset-y-0 rounded-full",
                        pts >= 0 ? "left-1/2 bg-success" : "right-1/2 bg-error",
                      )}
                      style={{ width: `${width}%` }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-right text-sm font-semibold tabular-nums",
                    pts !== null && (pts >= 0 ? "text-success" : "text-error"),
                  )}
                >
                  {formatDiff(d.difference)}
                </span>
              </div>
            </div>
          );
        })}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Bars show save % above or below the league average for each danger level, in percentage
          points (capped at ±{SCALE}). Danger levels follow MoneyPuck's expected-goal bands.
        </p>
      </CardContent>
    </Card>
  );
}
