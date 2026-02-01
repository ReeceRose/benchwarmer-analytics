import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonSelector } from "@/components/shared/SeasonSelector";
import { ErrorState } from "@/components/shared/ErrorState";
import { ShotHeatMap } from "@/components/shot-explorer/ShotHeatMap";
import { useTeamShots, useTeamShotsAgainst, useTeamSeasons } from "@/hooks";
import { getDangerZoneFromXg } from "@/lib/danger-zones";
import type { Shot } from "@/types";

interface TeamShotHeatMapsProps {
  teamAbbrev: string;
}

type HeatMapMode = "xg" | "volume";

interface ShotDifferential {
  totalFor: number;
  totalAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
  xgFor: number;
  xgAgainst: number;
  highDangerFor: number;
  highDangerAgainst: number;
}

function calculateDifferential(
  shotsFor: Shot[],
  shotsAgainst: Shot[]
): ShotDifferential {
  return {
    totalFor: shotsFor.length,
    totalAgainst: shotsAgainst.length,
    goalsFor: shotsFor.filter((s) => s.isGoal).length,
    goalsAgainst: shotsAgainst.filter((s) => s.isGoal).length,
    xgFor: shotsFor.reduce((sum, s) => sum + (s.xGoal ?? 0), 0),
    xgAgainst: shotsAgainst.reduce((sum, s) => sum + (s.xGoal ?? 0), 0),
    highDangerFor: shotsFor.filter((s) => getDangerZoneFromXg(s.xGoal) === "high").length,
    highDangerAgainst: shotsAgainst.filter((s) => getDangerZoneFromXg(s.xGoal) === "high").length,
  };
}

function DifferentialStat({
  label,
  forValue,
  againstValue,
  format = (v) => String(v),
  higherIsBetter = true,
}: {
  label: string;
  forValue: number;
  againstValue: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const diff = forValue - againstValue;
  const isGood = higherIsBetter ? diff > 0 : diff < 0;
  const isBad = higherIsBetter ? diff < 0 : diff > 0;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="tabular-nums w-12 text-right">{format(forValue)}</span>
        <span
          className={`tabular-nums w-14 text-right font-medium ${
            isGood
              ? "text-success"
              : isBad
                ? "text-error"
                : "text-muted-foreground"
          }`}
        >
          {diff > 0 ? "+" : ""}
          {format(diff)}
        </span>
        <span className="tabular-nums w-12 text-right">
          {format(againstValue)}
        </span>
      </div>
    </div>
  );
}

export function TeamShotHeatMaps({ teamAbbrev }: TeamShotHeatMapsProps) {
  const [season, setSeason] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<HeatMapMode>("xg");

  const { data: seasonsData } = useTeamSeasons(teamAbbrev);

  // Auto-select first available season
  const effectiveSeason = season ?? seasonsData?.seasons?.[0]?.year;

  const {
    data: shotsForData,
    isLoading: loadingFor,
    error: errorFor,
    refetch: refetchFor,
  } = useTeamShots(teamAbbrev, { season: effectiveSeason ?? 0 });

  const {
    data: shotsAgainstData,
    isLoading: loadingAgainst,
    error: errorAgainst,
    refetch: refetchAgainst,
  } = useTeamShotsAgainst(teamAbbrev, { season: effectiveSeason ?? 0 });

  const isLoading = loadingFor || loadingAgainst;
  const error = errorFor || errorAgainst;

  const differential = useMemo(() => {
    if (!shotsForData?.shots || !shotsAgainstData?.shots) return null;
    return calculateDifferential(shotsForData.shots, shotsAgainstData.shots);
  }, [shotsForData, shotsAgainstData]);

  if (!effectiveSeason) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Shot Heat Maps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select a season to view shot data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle>Shot Heat Maps</CardTitle>
            <div className="flex items-center rounded-md border p-1">
              <Button
                variant={mode === "xg" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setMode("xg")}
              >
                xG
              </Button>
              <Button
                variant={mode === "volume" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setMode("volume")}
              >
                Volume
              </Button>
            </div>
          </div>
          <SeasonSelector
            value={effectiveSeason}
            onValueChange={setSeason}
            teamAbbrev={teamAbbrev}
          />
        </CardHeader>
        <CardContent>
          {error && (
            <ErrorState
              title="Failed to load shot data"
              message="Could not fetch shot heat map data. Please try again."
              onRetry={() => {
                refetchFor();
                refetchAgainst();
              }}
            />
          )}

          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-80 w-full rounded-lg" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-80 w-full rounded-lg" />
              </div>
            </div>
          )}

          {!isLoading && !error && shotsForData && shotsAgainstData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ShotHeatMap
                  shots={shotsForData.shots}
                  mode={mode}
                  title="Shots For (Offensive)"
                />
                <ShotHeatMap
                  shots={shotsAgainstData.shots}
                  mode={mode}
                  title="Shots Against (Defensive)"
                />
              </div>

              {differential && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Shot Differential</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="w-12 text-right">For</span>
                        <span className="w-14 text-right">Diff</span>
                        <span className="w-12 text-right">Against</span>
                      </div>
                    </div>
                    <DifferentialStat
                      label="Total Shots"
                      forValue={differential.totalFor}
                      againstValue={differential.totalAgainst}
                    />
                    <DifferentialStat
                      label="Goals"
                      forValue={differential.goalsFor}
                      againstValue={differential.goalsAgainst}
                    />
                    <DifferentialStat
                      label="Expected Goals"
                      forValue={differential.xgFor}
                      againstValue={differential.xgAgainst}
                      format={(v) => v.toFixed(1)}
                    />
                    <DifferentialStat
                      label="High Danger"
                      forValue={differential.highDangerFor}
                      againstValue={differential.highDangerAgainst}
                    />
                    <DifferentialStat
                      label="Sh% For / Against"
                      forValue={
                        differential.totalFor > 0
                          ? (differential.goalsFor / differential.totalFor) * 100
                          : 0
                      }
                      againstValue={
                        differential.totalAgainst > 0
                          ? (differential.goalsAgainst / differential.totalAgainst) * 100
                          : 0
                      }
                      format={(v) => v.toFixed(1) + "%"}
                      higherIsBetter={true}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
