import type { TeamSpecialTeamsRanking, TeamVenuePenalties, VenuePenaltyTotals } from "@/types";

export type Venue = "all" | "home" | "away";

/** The penalty fields of a team's special-teams ranking. */
export type PenaltyRates = Pick<
  TeamSpecialTeamsRanking,
  | "gamesPlayed"
  | "penaltiesDrawn"
  | "penaltiesTaken"
  | "netPenalties"
  | "penaltiesDrawnPer60"
  | "penaltiesTakenPer60"
  | "netPenaltiesPer60"
  | "pimDrawn"
  | "pimTaken"
  | "ppMinutesPerGame"
  | "pkMinutesPerGame"
  | "ppGoalsPer60"
  | "pkGoalsAgainstPer60"
>;

const round = (v: number, digits: number) => Number(v.toFixed(digits));

/** Home games, road games, or both added together. */
export function venueTotals(team: TeamVenuePenalties, venue: Venue): VenuePenaltyTotals {
  if (venue !== "all") return team[venue];
  const { home, away } = team;
  return Object.fromEntries(
    (Object.keys(home) as (keyof VenuePenaltyTotals)[]).map((k) => [k, home[k] + away[k]]),
  ) as unknown as VenuePenaltyTotals;
}

/** Totals as the same rates the league table shows: per 60 of all-situations time. */
export function penaltyRates(t: VenuePenaltyTotals): PenaltyRates {
  const per60 = (n: number, seconds: number) => (seconds > 0 ? round((n / seconds) * 3600, 2) : 0);
  const perGame = (seconds: number) => (t.gamesPlayed > 0 ? round(seconds / 60 / t.gamesPlayed, 2) : 0);
  return {
    gamesPlayed: t.gamesPlayed,
    penaltiesDrawn: t.drawn,
    penaltiesTaken: t.taken,
    netPenalties: t.drawn - t.taken,
    penaltiesDrawnPer60: per60(t.drawn, t.iceTimeSeconds),
    penaltiesTakenPer60: per60(t.taken, t.iceTimeSeconds),
    netPenaltiesPer60: per60(t.drawn - t.taken, t.iceTimeSeconds),
    pimDrawn: t.pimDrawn,
    pimTaken: t.pimTaken,
    ppMinutesPerGame: perGame(t.ppSeconds),
    pkMinutesPerGame: perGame(t.pkSeconds),
    ppGoalsPer60: per60(t.ppGoals, t.ppSeconds),
    pkGoalsAgainstPer60: per60(t.pkGoalsAgainst, t.pkSeconds),
  };
}

/**
 * The season's rankings with their penalty fields swapped for home-only or
 * road-only figures. Teams missing from `byVenue` keep zeros.
 */
export function rankingsForVenue(
  rankings: readonly TeamSpecialTeamsRanking[],
  byVenue: readonly TeamVenuePenalties[] | undefined,
  venue: Venue,
): TeamSpecialTeamsRanking[] {
  if (venue === "all" || !byVenue) return [...rankings];
  const byTeam = new Map(byVenue.map((t) => [t.team, t]));
  return rankings.map((r) => {
    const team = byTeam.get(r.teamAbbreviation);
    const zero: VenuePenaltyTotals = {
      gamesPlayed: 0, iceTimeSeconds: 0, drawn: 0, taken: 0, pimDrawn: 0, pimTaken: 0,
      ppSeconds: 0, pkSeconds: 0, ppGoals: 0, pkGoalsAgainst: 0,
    };
    return { ...r, ...penaltyRates(team ? venueTotals(team, venue) : zero) };
  });
}
