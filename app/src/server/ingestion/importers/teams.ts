import { teamSeasons, teams } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { buildMapper } from "@/server/ingestion/map";
import { normalizeTeam } from "@/server/ingestion/normalize";
import { teamExpectedHeaders, teamFields } from "@/server/ingestion/records";

// Division/conference by team (current alignment, historical teams at their
// last alignment).
const TEAM_DIVISIONS: Record<string, [division: string, conference: string]> = {
  BOS: ["Atlantic", "Eastern"],
  BUF: ["Atlantic", "Eastern"],
  DET: ["Atlantic", "Eastern"],
  FLA: ["Atlantic", "Eastern"],
  MTL: ["Atlantic", "Eastern"],
  OTT: ["Atlantic", "Eastern"],
  TBL: ["Atlantic", "Eastern"],
  TOR: ["Atlantic", "Eastern"],
  CAR: ["Metropolitan", "Eastern"],
  CBJ: ["Metropolitan", "Eastern"],
  NJD: ["Metropolitan", "Eastern"],
  NYI: ["Metropolitan", "Eastern"],
  NYR: ["Metropolitan", "Eastern"],
  PHI: ["Metropolitan", "Eastern"],
  PIT: ["Metropolitan", "Eastern"],
  WSH: ["Metropolitan", "Eastern"],
  CHI: ["Central", "Western"],
  COL: ["Central", "Western"],
  DAL: ["Central", "Western"],
  MIN: ["Central", "Western"],
  NSH: ["Central", "Western"],
  STL: ["Central", "Western"],
  UTA: ["Central", "Western"],
  WPG: ["Central", "Western"],
  ANA: ["Pacific", "Western"],
  CGY: ["Pacific", "Western"],
  EDM: ["Pacific", "Western"],
  LAK: ["Pacific", "Western"],
  SJS: ["Pacific", "Western"],
  SEA: ["Pacific", "Western"],
  VAN: ["Pacific", "Western"],
  VGK: ["Pacific", "Western"],
  ARI: ["Central", "Western"],
  ATL: ["Southeast", "Eastern"],
  PHX: ["Pacific", "Western"],
  HFD: ["Northeast", "Eastern"],
  QUE: ["Northeast", "Eastern"],
  WIN: ["Smythe", "Western"],
  MNS: ["Norris", "Western"],
};

const ACTIVE_TEAMS = new Set([
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NJD",
  "NSH", "NYI", "NYR", "OTT", "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
]);

type TeamRecord = ParsedRecord<typeof teamFields>;

function teamSeasonMapper(isPlayoffs: boolean) {
  return buildMapper(teamSeasons, teamFields, {
    computed: {
      teamAbbreviation: (r: TeamRecord) => normalizeTeam(r.team),
      isPlayoffs: () => isPlayoffs,
    },
  });
}

// teams.csv mixes team totals with per-player rows; only "Team Level" rows
// are imported, into teams and team_seasons.
export async function importTeams(db: Queryable, csv: string, isPlayoffs: boolean): Promise<number> {
  const map = teamSeasonMapper(isPlayoffs);
  const teamRows = new Map<string, UpsertRow<typeof teams>>();
  const seasonRows: UpsertRow<typeof teamSeasons>[] = [];

  for await (const record of parseCsv(csv, teamFields, { expectedHeaders: teamExpectedHeaders })) {
    if (record.position !== "Team Level") continue;
    const abbreviation = normalizeTeam(record.team);
    if (!teamRows.has(abbreviation)) {
      const [division, conference] = TEAM_DIVISIONS[abbreviation] ?? [null, null];
      teamRows.set(abbreviation, {
        abbreviation,
        name: record.name,
        division,
        conference,
        isActive: ACTIVE_TEAMS.has(abbreviation),
      });
    }
    seasonRows.push(map(record));
  }

  const written = await upsert(db, teams, [...teamRows.values()], { conflict: ["abbreviation"] });
  return (
    written +
    (await upsert(db, teamSeasons, seasonRows, { conflict: ["teamAbbreviation", "season", "situation", "isPlayoffs"] }))
  );
}
