import type { StandingsGrouping } from "@/types";

export type PlayoffStatus = "division" | "wildcard" | null;

// NHL playoff format constants
export const DIVISION_PLAYOFF_SPOTS = 3;
export const WILDCARDS_PER_CONFERENCE = 2;
export const CONFERENCE_PLAYOFF_TEAMS = DIVISION_PLAYOFF_SPOTS * 2 + WILDCARDS_PER_CONFERENCE; // 8

interface TeamPlayoffData {
  divisionRank: number;
  wildcardRank: number;
}

export function getPlayoffStatus(
  team: TeamPlayoffData,
  grouping: StandingsGrouping,
  positionInList?: number,
): PlayoffStatus {
  if (grouping === "conference" && positionInList && positionInList > CONFERENCE_PLAYOFF_TEAMS) {
    return null;
  }

  // Division top 3 get automatic playoff spots
  if (team.divisionRank <= DIVISION_PLAYOFF_SPOTS) return "division";

  // Wildcards are the next 2 best teams in each conference
  if (team.wildcardRank > 0 && team.wildcardRank <= WILDCARDS_PER_CONFERENCE) return "wildcard";

  // Conference view: if we're in top 8 but not division/wildcard, we have a division spot
  if (grouping === "conference" && positionInList && positionInList <= CONFERENCE_PLAYOFF_TEAMS) {
    return "division";
  }

  return null;
}

export function getPlayoffCutoffIndex(
  teams: TeamPlayoffData[],
  grouping: StandingsGrouping,
): number {
  if (grouping === "division") {
    // Find first team that's not in playoff position
    return teams.findIndex(
      (t) =>
        t.divisionRank > DIVISION_PLAYOFF_SPOTS &&
        (t.wildcardRank === 0 || t.wildcardRank > WILDCARDS_PER_CONFERENCE),
    );
  } else if (grouping === "conference") {
    // In conference view sorted by points, cutoff is after position 8
    return teams.length > CONFERENCE_PLAYOFF_TEAMS ? CONFERENCE_PLAYOFF_TEAMS : -1;
  }
  return -1;
}
