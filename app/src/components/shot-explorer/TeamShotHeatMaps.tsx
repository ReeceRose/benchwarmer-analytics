import { useMemo, useState } from "react";
import { Panel, SegmentedControl } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ShotHeatMap } from "@/components/shot-explorer/ShotHeatMap";
import { formatSigned } from "@/components/shot-explorer/shot-utils";
import { useTeamShots, useTeamShotsAgainst } from "@/hooks";
import { getDangerZoneFromXg } from "@/lib/danger-zones";
import { cn } from "@/lib/utils";
import type { Shot } from "@/types";

interface TeamShotHeatMapsProps {
  teamAbbrev: string;
  season: number;
}

type HeatMapMode = "xg" | "volume";

function totals(shots: Shot[]) {
  const goals = shots.filter((s) => s.isGoal).length;
  return {
    shots: shots.length,
    goals,
    xg: shots.reduce((sum, s) => sum + (s.xGoal ?? 0), 0),
    highDanger: shots.filter((s) => getDangerZoneFromXg(s.xGoal) === "high").length,
    shootingPct: shots.length > 0 ? (goals / shots.length) * 100 : 0,
  };
}

function DifferentialRow({
  label,
  forValue,
  againstValue,
  digits = 0,
  suffix = "",
}: {
  label: string;
  forValue: number;
  againstValue: number;
  digits?: number;
  suffix?: string;
}) {
  const diff = forValue - againstValue;
  const format = (v: number) => `${v.toFixed(digits)}${suffix}`;
  return (
    <tr>
      <th scope="row" className="py-1.5 text-left text-sm font-normal text-muted-foreground">
        {label}
      </th>
      <td className={cn("py-1.5 text-right text-sm", diff > 0 && "font-semibold")}>
        {format(forValue)}
      </td>
      <td className={cn("py-1.5 text-right text-sm", diff < 0 && "font-semibold")}>
        {format(againstValue)}
      </td>
      <td
        className={cn(
          "py-1.5 text-right text-sm font-medium",
          diff > 0 && "text-success",
          diff < 0 && "text-error",
          diff === 0 && "text-muted-foreground",
        )}
      >
        {formatSigned(diff, digits)}
        {suffix}
      </td>
    </tr>
  );
}

/** Where a team shoots from next to where its opponents shoot from, with the totals side by side. */
export function TeamShotHeatMaps({ teamAbbrev, season }: TeamShotHeatMapsProps) {
  const [mode, setMode] = useState<HeatMapMode>("xg");

  const shotsFor = useTeamShots(teamAbbrev, { season });
  const shotsAgainst = useTeamShotsAgainst(teamAbbrev, { season });

  const isLoading = shotsFor.isLoading || shotsAgainst.isLoading;
  const error = shotsFor.error || shotsAgainst.error;

  const diff = useMemo(() => {
    if (!shotsFor.data || !shotsAgainst.data) return null;
    return { for: totals(shotsFor.data.shots), against: totals(shotsAgainst.data.shots) };
  }, [shotsFor.data, shotsAgainst.data]);

  if (error) {
    return (
      <ErrorState
        title="Failed to load shot data"
        message="Could not fetch shot heat map data. Please try again."
        onRetry={() => {
          shotsFor.refetch();
          shotsAgainst.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SegmentedControl
        aria-label="Colour by"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "xg", label: "Average xG" },
          { value: "volume", label: "Shot volume" },
        ]}
      />

      {isLoading || !shotsFor.data || !shotsAgainst.data || !diff ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="aspect-100/95 w-full rounded-2xl" />
            <Skeleton className="aspect-100/95 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="space-y-3">
              <h3 className="text-sm font-semibold">Shots for</h3>
              <ShotHeatMap shots={shotsFor.data.shots} mode={mode} className="max-w-none" />
            </Panel>
            <Panel className="space-y-3">
              <h3 className="text-sm font-semibold">Shots against</h3>
              <ShotHeatMap shots={shotsAgainst.data.shots} mode={mode} className="max-w-none" />
            </Panel>
          </div>

          <Panel>
            <h3 className="mb-2 text-sm font-semibold">For and against</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-1.5 text-left">
                    <span className="sr-only">Stat</span>
                  </th>
                  <th className="w-20 pb-1.5 text-right sm:w-28">For</th>
                  <th className="w-20 pb-1.5 text-right sm:w-28">Against</th>
                  <th className="w-20 pb-1.5 text-right sm:w-28">Diff</th>
                </tr>
              </thead>
              <tbody>
                <DifferentialRow label="Shots" forValue={diff.for.shots} againstValue={diff.against.shots} />
                <DifferentialRow label="Goals" forValue={diff.for.goals} againstValue={diff.against.goals} />
                <DifferentialRow
                  label="Expected goals"
                  forValue={diff.for.xg}
                  againstValue={diff.against.xg}
                  digits={1}
                />
                <DifferentialRow
                  label="High-danger shots"
                  forValue={diff.for.highDanger}
                  againstValue={diff.against.highDanger}
                />
                <DifferentialRow
                  label="Shooting %"
                  forValue={diff.for.shootingPct}
                  againstValue={diff.against.shootingPct}
                  digits={1}
                  suffix="%"
                />
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Bold is the better side. Shooting % is goals per unblocked shot attempt.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
