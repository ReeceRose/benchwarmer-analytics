import { players, skaterSeasonAdvanced, skaterSeasons } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { quoteIdent, upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { buildMapper } from "@/server/ingestion/map";
import { normalizePosition, normalizeTeam, roundHalfEven, toDecimal, truncInt } from "@/server/ingestion/normalize";
import { skaterFields } from "@/server/ingestion/records";

type SkaterRecord = ParsedRecord<typeof skaterFields>;

// value / seconds * 3600, rounded to 3 places. Port of SkaterImporter.CalculatePer60.
export function per60(value: string | null, iceTimeSeconds: number): string | null {
  if (value === null || iceTimeSeconds <= 0) return null;
  return roundHalfEven(toDecimal(value).div(iceTimeSeconds).mul(3600), 3);
}

function clampedRatio(numerator: ReturnType<typeof toDecimal>, denominator: ReturnType<typeof toDecimal>): string {
  const value = toDecimal(roundHalfEven(numerator.div(denominator), 4));
  if (value.lt(0)) return "0";
  if (value.gt(1)) return "1";
  return value.toString();
}

export function shootingPct(goalsFor: string | null, shotsOnGoalFor: string | null): string | null {
  if (goalsFor === null || shotsOnGoalFor === null || toDecimal(shotsOnGoalFor).lte(0)) return null;
  return clampedRatio(toDecimal(goalsFor), toDecimal(shotsOnGoalFor));
}

export function savePct(goalsAgainst: string | null, shotsOnGoalAgainst: string | null): string | null {
  if (goalsAgainst === null || shotsOnGoalAgainst === null || toDecimal(shotsOnGoalAgainst).lte(0)) return null;
  const shots = toDecimal(shotsOnGoalAgainst);
  return clampedRatio(shots.minus(goalsAgainst), shots);
}

function skaterSeasonRow(r: SkaterRecord, isPlayoffs: boolean): UpsertRow<typeof skaterSeasons> {
  const iceTimeSeconds = truncInt(r.iceTime);
  return {
    playerId: r.playerId,
    season: r.season,
    team: normalizeTeam(r.team),
    situation: r.situation,
    isPlayoffs,
    gamesPlayed: r.gamesPlayed,
    iceTimeSeconds,
    goals: truncInt(r.goals),
    assists: truncInt(toDecimal(r.primaryAssists).plus(r.secondaryAssists).toString()),
    shots: truncInt(r.shots),
    expectedGoals: r.expectedGoals,
    expectedGoalsPer60: per60(r.expectedGoals, iceTimeSeconds),
    onIceShootingPct: shootingPct(r.onIceGoalsFor, r.onIceShotsOnGoalFor),
    onIceSavePct: savePct(r.onIceGoalsAgainst, r.onIceShotsOnGoalAgainst),
    corsiForPct: r.corsiPct,
    fenwickForPct: r.fenwickPct,
  };
}

// Inserts players seen in a season file, or refreshes name/current team (and
// position when known) for existing ones. Port of
// PlayerRepository.UpsertBasicInfoAsync, except that a season older than the
// player's newest stored season leaves the player untouched, so re-importing
// an old season doesn't roll back current teams.
export async function upsertBasicPlayers(
  db: Queryable,
  season: number,
  rows: { id: number; name: string; currentTeamAbbreviation: string | null; position: string | null }[],
): Promise<number> {
  const s = Math.trunc(season);
  const newer = `EXISTS (SELECT 1 FROM skater_seasons x WHERE x.player_id = "players"."id" AND x.season > ${s})
    OR EXISTS (SELECT 1 FROM goalie_seasons x WHERE x.player_id = "players"."id" AND x.season > ${s})`;
  const keep = (col: string, value: string) => `CASE WHEN ${newer} THEN "players".${quoteIdent(col)} ELSE ${value} END`;
  return upsert(db, players, rows, {
    conflict: ["id"],
    update: ["name", "currentTeamAbbreviation", "position"],
    updateExpressions: {
      name: keep("name", `EXCLUDED."name"`),
      current_team_abbreviation: keep("current_team_abbreviation", `EXCLUDED."current_team_abbreviation"`),
      position: keep("position", `COALESCE(EXCLUDED."position", "players"."position")`),
    },
  });
}

// MoneyPuck season files hold exactly one season.
export function singleSeason(rows: { season?: unknown }[]): number {
  const seasons = new Set(rows.map((r) => r.season));
  if (seasons.size !== 1) throw new Error(`expected one season per file, found ${[...seasons].join(", ") || "none"}`);
  return [...seasons][0] as number;
}

// Port of SkaterImporter: per player (first row wins for name/team/position),
// then skater_seasons with derived rates and skater_season_advanced with every
// remaining MoneyPuck column.
export async function importSkaters(db: Queryable, csv: string, isPlayoffs: boolean): Promise<number> {
  const mapAdvanced = buildMapper(skaterSeasonAdvanced, skaterFields, {
    computed: {
      playerId: (r: SkaterRecord) => r.playerId,
      season: (r: SkaterRecord) => r.season,
      team: (r: SkaterRecord) => normalizeTeam(r.team),
      situation: (r: SkaterRecord) => r.situation,
      isPlayoffs: () => isPlayoffs,
    },
  });

  const basics = new Map<number, Parameters<typeof upsertBasicPlayers>[2][number]>();
  const seasonRows: UpsertRow<typeof skaterSeasons>[] = [];
  const advancedRows: UpsertRow<typeof skaterSeasonAdvanced>[] = [];

  for await (const r of parseCsv(csv, skaterFields)) {
    if (!basics.has(r.playerId)) {
      basics.set(r.playerId, {
        id: r.playerId,
        name: r.name,
        currentTeamAbbreviation: normalizeTeam(r.team),
        position: normalizePosition(r.position),
      });
    }
    seasonRows.push(skaterSeasonRow(r, isPlayoffs));
    advancedRows.push(mapAdvanced(r));
  }

  if (seasonRows.length === 0) return 0;
  const key = ["playerId", "season", "team", "situation", "isPlayoffs"] as const;
  let written = await upsertBasicPlayers(db, singleSeason(seasonRows), [...basics.values()]);
  written += await upsert(db, skaterSeasons, seasonRows, { conflict: [...key] });
  written += await upsert(db, skaterSeasonAdvanced, advancedRows, { conflict: [...key] });
  return written;
}
