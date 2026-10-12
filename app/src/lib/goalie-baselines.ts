import type { GoalieLeagueBaselinesResponse } from "@/types";

export interface DangerZoneLeagueAverages {
  lowDanger: number;
  mediumDanger: number;
  highDanger: number;
}

export function getDangerZoneLeagueAveragesFromGoalieBaselines(
  baselines: GoalieLeagueBaselinesResponse | undefined
): DangerZoneLeagueAverages | undefined {
  if (!baselines) return undefined;

  const { lowDangerSavePct, mediumDangerSavePct, highDangerSavePct } = baselines;
  if (lowDangerSavePct == null || mediumDangerSavePct == null || highDangerSavePct == null) {
    return undefined;
  }

  return {
    lowDanger: lowDangerSavePct,
    mediumDanger: mediumDangerSavePct,
    highDanger: highDangerSavePct,
  };
}

