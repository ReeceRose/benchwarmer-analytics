import type { MilestoneKind, MilestoneMoment } from "@/types";

export const MILESTONE_CLUBS: { kind: MilestoneKind; label: string; short: string }[] = [
  { kind: "points-1000", label: "1,000 career points", short: "1,000 points" },
  { kind: "goals-500", label: "500 career goals", short: "500 goals" },
  { kind: "season-points-100", label: "100-point seasons", short: "100-point seasons" },
  { kind: "season-goals-50", label: "50-goal seasons", short: "50-goal seasons" },
];

/** "1,000th point", "500th goal", "100-point season, 2022-23 (153 points)". */
export function milestoneTitle(m: MilestoneMoment): string {
  const season = `${m.season}-${String(m.season + 1).slice(2)}`;
  switch (m.kind) {
    case "points-1000":
      return "1,000th point";
    case "goals-500":
      return "500th goal";
    case "season-points-100":
      return `100-point season, ${season}${m.seasonTotal ? ` (${m.seasonTotal} points)` : ""}`;
    case "season-goals-50":
      return `50-goal season, ${season}${m.seasonTotal ? ` (${m.seasonTotal} goals)` : ""}`;
  }
}

/** "WSH 7–1 OTT" with the away team first, or null when the score isn't known. */
export function milestoneGame(m: MilestoneMoment): string | null {
  if (!m.awayTeam || !m.homeTeam) return null;
  if (m.awayScore == null || m.homeScore == null) return `${m.awayTeam} @ ${m.homeTeam}`;
  return `${m.awayTeam} ${m.awayScore} @ ${m.homeTeam} ${m.homeScore}`;
}
