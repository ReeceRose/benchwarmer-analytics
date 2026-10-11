import { goalieSeasons } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { singleSeason, upsertBasicPlayers } from "@/server/ingestion/importers/skaters";
import { normalizeTeam, toDecimal, truncInt } from "@/server/ingestion/normalize";
import { goalieFields } from "@/server/ingestion/records";

type GoalieRecord = ParsedRecord<typeof goalieFields>;

const count = (value: string | null) => truncInt(value ?? 0);

// Port of GoalieImporter's derived stats (full decimal precision, no rounding).
export function goalieDerived(goalsAgainst: number, shotsAgainst: number, iceTimeSeconds: number, xGoalsAgainst: string | null) {
  return {
    savePercentage: shotsAgainst > 0 ? toDecimal(shotsAgainst - goalsAgainst).div(shotsAgainst).toString() : null,
    // Goals against per 60 minutes of ice time.
    goalsAgainstAverage: iceTimeSeconds > 0 ? toDecimal(goalsAgainst).div(toDecimal(iceTimeSeconds).div(3600)).toString() : null,
    goalsSavedAboveExpected: xGoalsAgainst === null ? null : toDecimal(xGoalsAgainst).minus(goalsAgainst).toString(),
  };
}

function goalieSeasonRow(r: GoalieRecord, isPlayoffs: boolean): UpsertRow<typeof goalieSeasons> {
  const iceTimeSeconds = truncInt(r.iceTime);
  const goalsAgainst = count(r.goalsAgainst);
  const shotsAgainst = count(r.shotsAgainst);
  return {
    playerId: r.playerId,
    season: r.season,
    team: normalizeTeam(r.team),
    situation: r.situation,
    isPlayoffs,
    gamesPlayed: r.gamesPlayed,
    iceTimeSeconds,
    goalsAgainst,
    shotsAgainst,
    expectedGoalsAgainst: r.expectedGoalsAgainst,
    ...goalieDerived(goalsAgainst, shotsAgainst, iceTimeSeconds, r.expectedGoalsAgainst),
    lowDangerShots: count(r.lowDangerShots),
    mediumDangerShots: count(r.mediumDangerShots),
    highDangerShots: count(r.highDangerShots),
    lowDangerGoals: count(r.lowDangerGoals),
    mediumDangerGoals: count(r.mediumDangerGoals),
    highDangerGoals: count(r.highDangerGoals),
    expectedRebounds: r.expectedRebounds,
    rebounds: count(r.rebounds),
  };
}

// Port of GoalieImporter.
export async function importGoalies(db: Queryable, csv: string, isPlayoffs: boolean): Promise<number> {
  const basics = new Map<number, Parameters<typeof upsertBasicPlayers>[2][number]>();
  const rows: UpsertRow<typeof goalieSeasons>[] = [];
  for await (const r of parseCsv(csv, goalieFields)) {
    if (!basics.has(r.playerId)) {
      basics.set(r.playerId, { id: r.playerId, name: r.name, currentTeamAbbreviation: normalizeTeam(r.team), position: "G" });
    }
    rows.push(goalieSeasonRow(r, isPlayoffs));
  }
  if (rows.length === 0) return 0;
  let written = await upsertBasicPlayers(db, singleSeason(rows), [...basics.values()]);
  written += await upsert(db, goalieSeasons, rows, {
    conflict: ["playerId", "season", "team", "situation", "isPlayoffs"],
  });
  return written;
}
