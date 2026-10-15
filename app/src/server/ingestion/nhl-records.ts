// NHL records (records.nhl.com/site/api): franchises, franchise seasons,
// all-time head-to-head records, every entry draft pick and every player's
// NHL career totals. Each list comes back whole in one request (limit=-1),
// fetched one at a time to stay polite.

import {
  awardWinners,
  coaches,
  draftLotteries,
  draftPicks,
  franchiseHeadToHead,
  franchiseSeasons,
  franchisePeople,
  franchises,
  hallOfFame,
  leagueAttendance,
  milestoneMoments,
  officials,
  playerCareers,
  trophies,
} from "@/server/db/schema";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { fetchWithRetry } from "@/server/ingestion/moneypuck";
import { round } from "@/server/api/format";

const RECORDS_API = "https://records.nhl.com/site/api";

async function fetchAll<T>(resource: string, filter?: string): Promise<T[]> {
  const params = new URLSearchParams({ limit: "-1" });
  if (filter) params.set("cayenneExp", filter);
  const response = await fetchWithRetry(`${RECORDS_API}/${resource}?${params}`);
  if (!response) throw new Error(`NHL records ${resource}: not found`);
  const body = (await response.json()) as { data?: T[] };
  return body.data ?? [];
}

// 20242025 -> 2024
export const startYear = (seasonId: number | null | undefined) => (seasonId ? Math.floor(seasonId / 10000) : null);

// The records site uses 0 for "no division" and similar.
const positive = (n: number | null | undefined) => (n != null && n > 0 ? n : null);

interface RecordsFranchise {
  id: number;
  fullName: string;
  teamAbbrev?: string | null;
  firstSeasonId: number;
  lastSeasonId?: number | null;
}

export function toFranchiseRow(f: RecordsFranchise): UpsertRow<typeof franchises> {
  return {
    id: f.id,
    fullName: f.fullName,
    teamAbbreviation: f.teamAbbrev ?? null,
    firstSeason: startYear(f.firstSeasonId)!,
    lastSeason: startYear(f.lastSeasonId),
  };
}

export interface RecordsFranchiseSeason {
  franchiseId: number;
  seasonId: number;
  teamId: number;
  triCode: string;
  teamName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties?: number | null;
  overtimeLosses?: number | null;
  points: number;
  goals: number;
  goalsAgainst: number;
  divisionName?: string | null;
  divisionSequence?: number | null;
  leagueSequence?: number | null;
  inPlayoffs?: boolean | null;
  seriesTitle?: string | null;
  playoffRound?: number | null;
  finalPlayoffRound?: number | null;
  decision?: string | null;
}

export function toFranchiseSeasonRow(r: RecordsFranchiseSeason): UpsertRow<typeof franchiseSeasons> {
  const madePlayoffs = r.inPlayoffs === true;
  return {
    franchiseId: r.franchiseId,
    season: startYear(r.seasonId)!,
    teamId: r.teamId,
    teamAbbreviation: r.triCode,
    teamName: r.teamName,
    gamesPlayed: r.gamesPlayed,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties ?? null,
    overtimeLosses: r.overtimeLosses ?? null,
    points: r.points,
    goalsFor: r.goals,
    goalsAgainst: r.goalsAgainst,
    divisionName: r.divisionName ?? null,
    divisionRank: positive(r.divisionSequence),
    leagueRank: positive(r.leagueSequence),
    madePlayoffs,
    playoffResult: madePlayoffs ? (r.seriesTitle ?? null) : null,
    playoffRound: madePlayoffs ? positive(r.playoffRound) : null,
    // Won the last round played. Before 1927 the NHL champion still had to
    // beat another league for the Cup, which these records don't cover.
    wonCup: madePlayoffs && r.decision === "W" && r.playoffRound != null && r.playoffRound === r.finalPlayoffRound,
  };
}

interface RecordsHeadToHead {
  teamFranchiseId: number;
  opponentFranchiseId: number;
  gameTypeId: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalTies?: number | null;
  totalOtLosses?: number | null;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
  totalLastMeetingSeasonId?: number | null;
}

export function toHeadToHeadRow(r: RecordsHeadToHead): UpsertRow<typeof franchiseHeadToHead> {
  return {
    franchiseId: r.teamFranchiseId,
    opponentFranchiseId: r.opponentFranchiseId,
    isPlayoffs: r.gameTypeId === 3,
    gamesPlayed: r.totalGamesPlayed,
    wins: r.totalWins,
    losses: r.totalLosses,
    ties: r.totalTies ?? 0,
    overtimeLosses: r.totalOtLosses ?? 0,
    goalsFor: r.totalGoalsFor,
    goalsAgainst: r.totalGoalsAgainst,
    lastMeetingSeason: startYear(r.totalLastMeetingSeasonId),
  };
}

interface RecordsDraftPick {
  id: number;
  draftYear: number;
  roundNumber: number;
  pickInRound: number;
  overallPickNumber: number;
  draftedByTeamId: number;
  triCode: string;
  playerId?: number | null;
  playerName: string;
  position?: string | null;
  amateurClubName?: string | null;
  amateurLeague?: string | null;
  countryCode?: string | null;
  birthDate?: string | null;
  supplementalDraft?: string | null;
}

export function toDraftPickRow(p: RecordsDraftPick, franchiseByTeamId: Map<number, number>): UpsertRow<typeof draftPicks> | null {
  if (p.supplementalDraft === "Y") return null;
  return {
    id: p.id,
    draftYear: p.draftYear,
    round: p.roundNumber,
    pickInRound: p.pickInRound,
    overallPick: p.overallPickNumber,
    teamId: p.draftedByTeamId,
    teamAbbreviation: p.triCode,
    franchiseId: franchiseByTeamId.get(p.draftedByTeamId) ?? null,
    playerId: p.playerId || null,
    playerName: p.playerName,
    position: p.position || null,
    amateurClub: p.amateurClubName || null,
    amateurLeague: p.amateurLeague || null,
    countryCode: p.countryCode || null,
    birthDate: p.birthDate || null,
  };
}

interface RecordsCareer {
  playerId: number;
  firstName?: string | null;
  lastName?: string | null;
  positionCode?: string | null;
  gamesPlayed: number;
  goals?: number | null;
  assists?: number | null;
  points?: number | null;
  wins?: number | null;
  firstSeasonForGameType?: number | null;
  lastSeasonForGameType?: number | null;
  activePlayer?: boolean | null;
  // Goalie playoff rows
  gameSevenWins?: number | null;
  gameSevenLosses?: number | null;
  overtimeWins?: number | null;
  overtimeLosses?: number | null;
  overtimeSavePctg?: number | null;
}

// `playoffs` is the goalie's playoff career row, for Game 7 and overtime records.
export function toCareerRow(c: RecordsCareer, goalie: boolean, playoffs?: RecordsCareer): UpsertRow<typeof playerCareers> {
  return {
    playerId: c.playerId,
    name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    position: c.positionCode ?? (goalie ? "G" : null),
    gamesPlayed: c.gamesPlayed,
    goals: goalie ? null : (c.goals ?? 0),
    assists: goalie ? null : (c.assists ?? 0),
    points: goalie ? null : (c.points ?? 0),
    wins: goalie ? (c.wins ?? 0) : null,
    playoffGames: playoffs ? playoffs.gamesPlayed : null,
    gameSevenWins: playoffs ? (playoffs.gameSevenWins ?? 0) : null,
    gameSevenLosses: playoffs ? (playoffs.gameSevenLosses ?? 0) : null,
    playoffOvertimeWins: playoffs ? (playoffs.overtimeWins ?? 0) : null,
    playoffOvertimeLosses: playoffs ? (playoffs.overtimeLosses ?? 0) : null,
    playoffOvertimeSavePct: playoffs?.overtimeSavePctg != null ? String(round(playoffs.overtimeSavePctg, 4)) : null,
    firstSeason: startYear(c.firstSeasonForGameType),
    lastSeason: startYear(c.lastSeasonForGameType),
    isActive: c.activePlayer === true,
  };
}

interface RecordsTrophy {
  id: number;
  name: string;
  shortName: string;
  categoryId: number;
  briefDescription?: string | null;
  imageUrl?: string | null;
}

export function toTrophyRow(t: RecordsTrophy): UpsertRow<typeof trophies> {
  return {
    id: t.id,
    // Curly quotes as published ("Maurice “Rocket” Richard Trophy").
    name: t.name.trim(),
    slug: t.shortName,
    categoryId: t.categoryId,
    description: t.briefDescription?.trim() || null,
    imageUrl: t.imageUrl || null,
  };
}

interface RecordsAward {
  id: number;
  trophyId: number;
  seasonId: number;
  status?: string | null;
  fullName?: string | null;
  playerId?: number | null;
  teamId?: number | null;
  isRookie?: boolean | null;
}

export function toAwardRow(a: RecordsAward, franchiseByTeamId: Map<number, number>): UpsertRow<typeof awardWinners> | null {
  if (!a.fullName || !a.seasonId) return null;
  return {
    id: a.id,
    trophyId: a.trophyId,
    season: startYear(a.seasonId)!,
    status: a.status ?? "WINNER",
    fullName: a.fullName.trim(),
    playerId: a.playerId || null,
    teamId: a.teamId || null,
    franchiseId: a.teamId ? (franchiseByTeamId.get(a.teamId) ?? null) : null,
    isRookie: a.isRookie === true,
  };
}

// --- HTML lists and text from the records site ---

const ENTITIES: Record<string, string> = {
  nbsp: " ", ndash: "–", mdash: "—", amp: "&", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", quot: '"', apos: "'",
  eacute: "é", egrave: "è", ccedil: "ç", ouml: "ö", auml: "ä", uuml: "ü", aacute: "á", iacute: "í", oacute: "ó",
};

/** Plain text from a small HTML fragment: tags out, entities decoded, whitespace collapsed per line. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** The text of each <li>, skipping footnotes ("* Includes time with…"). */
export function listItems(html: string | null | undefined): string[] {
  return [...(html ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => htmlToText(m[1]).replace(/\n/g, " "))
    // Footnotes ("* Includes time with…") and empty lists ("None").
    .filter((t) => t && !t.startsWith("*") && t !== "None");
}

/** "Connor McDavid: 2016-17 – Present" -> name and tenure. */
export function parsePerson(item: string): { name: string; tenure: string | null } {
  const i = item.indexOf(":");
  if (i === -1) return { name: item, tenure: null };
  const name = item.slice(0, i).trim();
  return { name: name === "(No Captain)" ? "No captain" : name, tenure: item.slice(i + 1).trim() || null };
}

/** "99 – Wayne Gretzky (1979-88)" -> number, name and years. */
export function parseRetired(item: string): { sweaterNumber: number | null; name: string; tenure: string | null } {
  const m = item.match(/^(\d+)\s*[–-]\s*(.+?)\s*(?:\(([^)]*)\))?\s*\*?$/);
  return m ? { sweaterNumber: Number(m[1]), name: m[2].trim(), tenure: m[3]?.trim() || null } : { sweaterNumber: null, name: item, tenure: null };
}

interface RecordsFranchiseDetail {
  id: number;
  captainHistory?: string | null;
  coachingHistory?: string | null;
  generalManagerHistory?: string | null;
  retiredNumbersSummary?: string | null;
}

export function toFranchisePeopleRows(d: RecordsFranchiseDetail): UpsertRow<typeof franchisePeople>[] {
  const people = (role: string, html: string | null | undefined) =>
    listItems(html).map((item, position) => ({ franchiseId: d.id, role, position, ...parsePerson(item), sweaterNumber: null }));
  return [
    ...people("captain", d.captainHistory),
    ...people("coach", d.coachingHistory),
    ...people("gm", d.generalManagerHistory),
    ...listItems(d.retiredNumbersSummary).map((item, position) => ({ franchiseId: d.id, role: "retired", position, ...parseRetired(item) })),
  ];
}

interface RecordsMilestone {
  gameId: number;
  gameDate: string;
  seasonId: number;
  skaterId: number;
  skaterFirstName?: string | null;
  skaterLastName?: string | null;
  skaterTeamId?: number | null;
  skaterTeamName?: string | null;
  homeTriCode?: string | null;
  visitorTriCode?: string | null;
  homeScore?: number | null;
  visitorScore?: number | null;
  ageInYears?: number | null;
  skaterGamesPlayed?: number | null;
  skaterSeasonGamesPlayed?: number | null;
  seasonPoints?: number | null;
  seasonGoals?: number | null;
  goalieFirstName?: string | null;
  goalieLastName?: string | null;
  activePlayer?: number | boolean | null;
}

export const MILESTONE_LISTS = [
  { kind: "points-1000", resource: "milestone-1000-point-career", season: false },
  { kind: "goals-500", resource: "milestone-500-goal-career", season: false },
  { kind: "season-points-100", resource: "milestone-100-point-season", season: true },
  { kind: "season-goals-50", resource: "milestone-50-goal-season", season: true },
] as const;

export function toMilestoneRow(kind: string, seasonList: boolean, m: RecordsMilestone): UpsertRow<typeof milestoneMoments> {
  const goalie = [m.goalieFirstName, m.goalieLastName].filter(Boolean).join(" ");
  return {
    id: `${kind}-${m.gameId}-${m.skaterId}`,
    kind,
    playerId: m.skaterId,
    name: [m.skaterFirstName, m.skaterLastName].filter(Boolean).join(" "),
    season: startYear(m.seasonId)!,
    gameId: String(m.gameId),
    gameDate: m.gameDate.slice(0, 10),
    teamId: m.skaterTeamId ?? null,
    teamName: m.skaterTeamName ?? null,
    homeTeam: m.homeTriCode ?? null,
    awayTeam: m.visitorTriCode ?? null,
    homeScore: m.homeScore ?? null,
    awayScore: m.visitorScore ?? null,
    ageYears: m.ageInYears ?? null,
    gamesPlayed: (seasonList ? m.skaterSeasonGamesPlayed : m.skaterGamesPlayed) ?? null,
    seasonTotal: seasonList ? (m.seasonPoints ?? m.seasonGoals ?? null) : null,
    goalieName: goalie || null,
    isActive: m.activePlayer === true || m.activePlayer === 1,
  };
}

interface RecordsLottery {
  draftYear: number;
  formatContent?: string | null;
  oddsContent?: string | null;
  resultNotes?: string | null;
}

export function toLotteryRow(l: RecordsLottery): UpsertRow<typeof draftLotteries> {
  const image = l.oddsContent?.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
  return {
    draftYear: l.draftYear,
    format: htmlToText(l.formatContent) || null,
    oddsImageUrl: image ? encodeURI(decodeURI(image)) : null,
    notes: htmlToText(l.oddsContent) || null,
    results: htmlToText(l.resultNotes) || null,
  };
}

export interface RecordsImportResult {
  franchises: number;
  franchiseSeasons: number;
  headToHead: number;
  draftPicks: number;
  careers: number;
  trophies: number;
  awards: number;
  extras: number;
}

// Franchises first (foreign keys), then the rest. Re-runs write ~0 rows.
export async function importNhlRecords(db: Queryable): Promise<RecordsImportResult> {
  const franchiseRows = (await fetchAll<RecordsFranchise>("franchise")).map(toFranchiseRow);
  const writtenFranchises = await upsert(db, franchises, franchiseRows, { conflict: ["id"] });

  const seasonRows = await fetchAll<RecordsFranchiseSeason>("franchise-season-results", "gameTypeId=2");
  const writtenSeasons = await upsert(db, franchiseSeasons, seasonRows.map(toFranchiseSeasonRow), {
    conflict: ["franchiseId", "season"],
  });

  // The list includes early Stanley Cup opponents from other leagues
  // (Victoria Cougars, Seattle Metropolitans), which aren't NHL franchises.
  const franchiseIds = new Set(franchiseRows.map((f) => f.id));
  const headToHead = (await fetchAll<RecordsHeadToHead>("all-time-record-vs-franchise"))
    .filter((r) => (r.gameTypeId === 2 || r.gameTypeId === 3) && franchiseIds.has(r.teamFranchiseId) && franchiseIds.has(r.opponentFranchiseId))
    .map(toHeadToHeadRow);
  const writtenHeadToHead = await upsert(db, franchiseHeadToHead, headToHead, {
    conflict: ["franchiseId", "opponentFranchiseId", "isPlayoffs"],
  });

  // A team ID belongs to one franchise across every season it played.
  const franchiseByTeamId = new Map(seasonRows.map((r) => [r.teamId, r.franchiseId]));
  const picks = (await fetchAll<RecordsDraftPick>("draft"))
    .map((p) => toDraftPickRow(p, franchiseByTeamId))
    .filter((p) => p !== null);
  const writtenPicks = await upsert(db, draftPicks, picks, { conflict: ["id"] });

  const skaters = (await fetchAll<RecordsCareer>("skater-career-scoring-regular-season", "franchiseId=null")).map((c) =>
    toCareerRow(c, false),
  );
  const goaliePlayoffs = new Map(
    (await fetchAll<RecordsCareer>("goalie-career-stats", "franchiseId=null and gameTypeId=3")).map((c) => [c.playerId, c]),
  );
  const goalies = (await fetchAll<RecordsCareer>("goalie-career-stats", "franchiseId=null and gameTypeId=2")).map((c) =>
    toCareerRow(c, true, goaliePlayoffs.get(c.playerId)),
  );
  const writtenCareers = await upsert(db, playerCareers, [...skaters, ...goalies], { conflict: ["playerId"] });

  const trophyRows = (await fetchAll<RecordsTrophy>("trophy")).map(toTrophyRow);
  const writtenTrophies = await upsert(db, trophies, trophyRows, { conflict: ["id"] });
  const trophyIds = new Set(trophyRows.map((t) => t.id));
  const awards = (await fetchAll<RecordsAward>("award-details"))
    .filter((a) => trophyIds.has(a.trophyId))
    .map((a) => toAwardRow(a, franchiseByTeamId))
    .filter((a) => a !== null);
  const writtenAwards = await upsert(db, awardWinners, awards, { conflict: ["id"] });

  const extras = await importRecordsExtras(db, franchiseRows.map((f) => f.id as number));

  return {
    franchises: writtenFranchises,
    franchiseSeasons: writtenSeasons,
    headToHead: writtenHeadToHead,
    draftPicks: writtenPicks,
    careers: writtenCareers,
    trophies: writtenTrophies,
    awards: writtenAwards,
    extras,
  };
}

// Franchise people, the Hall of Fame, milestone moments, officials, coaches,
// attendance and draft lotteries. Returns rows written.
async function importRecordsExtras(db: Queryable, franchiseIds: number[]): Promise<number> {
  let written = 0;

  const details = await fetchAll<RecordsFranchiseDetail>("franchise-detail");
  const people = details.filter((d) => franchiseIds.includes(d.id)).flatMap(toFranchisePeopleRows);
  written += await upsert(db, franchisePeople, people, { conflict: ["franchiseId", "role", "position"] });
  // A list that got shorter leaves stale rows behind: drop rows not in this import.
  if (people.length > 0) {
    await db.query(
      `delete from franchise_people where (franchise_id, role, position) not in (
         select * from unnest($1::int[], $2::text[], $3::int[]))`,
      [people.map((p) => p.franchiseId), people.map((p) => p.role), people.map((p) => p.position)],
    );
  }

  const inducted = new Map<number, number | null>();
  // officeId 1 is the Hockey Hall of Fame; 2 and 3 are the US and IIHF halls.
  for (const h of await fetchAll<{ playerId?: number | null; dateInducted?: string | null; officeId?: number | null }>("hof/players")) {
    if (!h.playerId || h.officeId !== 1) continue;
    const year = h.dateInducted ? Number(h.dateInducted.slice(0, 4)) : null;
    const prev = inducted.get(h.playerId);
    inducted.set(h.playerId, prev == null ? year : year == null ? prev : Math.min(prev, year));
  }
  written += await upsert(db, hallOfFame, [...inducted].map(([playerId, inductedYear]) => ({ playerId, inductedYear })), { conflict: ["playerId"] });
  if (inducted.size > 0) {
    const removed = await db.query("delete from hall_of_fame where not (player_id = any($1::int[]))", [[...inducted.keys()]]);
    written += removed.rowCount ?? 0;
  }

  for (const list of MILESTONE_LISTS) {
    const rows = (await fetchAll<RecordsMilestone>(list.resource)).map((m) => toMilestoneRow(list.kind, list.season, m));
    written += await upsert(db, milestoneMoments, rows, { conflict: ["id"] });
  }

  const officialRows = (await fetchAll<{
    id: number; firstName?: string | null; lastName?: string | null; officialType?: string | null; sweaterNumber?: number | null;
    firstRegularGameId?: number | null; firstPlayoffGameId?: number | null; nationalityCode?: string | null; countryCode?: string | null; active?: boolean | null;
  }>("officials")).map((o) => ({
    id: o.id,
    name: [o.firstName, o.lastName].filter(Boolean).join(" "),
    officialType: o.officialType ?? "Official",
    sweaterNumber: o.sweaterNumber ?? null,
    firstRegularGameId: o.firstRegularGameId ? String(o.firstRegularGameId) : null,
    firstPlayoffGameId: o.firstPlayoffGameId ? String(o.firstPlayoffGameId) : null,
    countryCode: o.nationalityCode ?? o.countryCode ?? null,
    isActive: o.active === true,
  }));
  written += await upsert(db, officials, officialRows, { conflict: ["id"] });

  const coachRows = (await fetchAll<{ id: number; fullName?: string | null; stanleyCup?: number | null; inHockeyHof?: boolean | null; isActive?: boolean | null }>(
    "coach",
  ))
    .filter((c) => c.fullName)
    .map((c) => ({ id: c.id, name: c.fullName!, stanleyCups: c.stanleyCup ?? 0, inHallOfFame: c.inHockeyHof === true, isActive: c.isActive === true }));
  written += await upsert(db, coaches, coachRows, { conflict: ["id"] });

  const attendance = (await fetchAll<{ seasonId: number; regularAttendance?: number | null; playoffAttendance?: number | null; totalAttendance?: number | null }>(
    "attendance",
  )).map((a) => ({ season: startYear(a.seasonId)!, regular: a.regularAttendance ?? null, playoffs: a.playoffAttendance ?? null, total: a.totalAttendance ?? null }));
  written += await upsert(db, leagueAttendance, attendance, { conflict: ["season"] });

  const lotteries = (await fetchAll<RecordsLottery>("draft-lottery-odds")).map(toLotteryRow);
  written += await upsert(db, draftLotteries, lotteries, { conflict: ["draftYear"] });

  return written;
}
