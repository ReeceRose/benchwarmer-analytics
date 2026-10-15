// NHL EDGE tracking for players and teams, read from the NHL API at request
// time. The NHL works out percentiles, ranks and league averages, so this
// only reshapes them.

import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { requirePlayer } from "@/server/api/players";
import { currentSeason } from "@/server/ingestion/normalize";
import {
  getEdgeGoalieDetail,
  getEdgeSkaterDetail,
  getEdgeTeamDetail,
  getEdgeTop10,
  type NhlEdgeAreaDetail,
  type NhlEdgeCount,
  type NhlEdgeLeader,
  type NhlEdgeMeasure,
  type NhlEdgeSeasons,
  type NhlEdgeSogSummary,
  type NhlEdgeZoneTime,
} from "@/server/api/nhl-client";
import type {
  GoalieTracking,
  PlayerTrackingResponse,
  SkaterTracking,
  TeamTracking,
  TeamTrackingResponse,
  TrackingArea,
  TrackingLeaderBoard,
  TrackingLeaderPosition,
  TrackingLeadersResponse,
  TrackingMetric,
  TrackingPeak,
  TrackingShotArea,
  TrackingZoneTime,
} from "@/types";

// NHL team IDs (EDGE keys teams by ID, not abbreviation).
export const NHL_TEAM_IDS: Record<string, number> = {
  NJD: 1, NYI: 2, NYR: 3, PHI: 4, PIT: 5, BOS: 6, BUF: 7, MTL: 8, OTT: 9, TOR: 10,
  CAR: 12, FLA: 13, TBL: 14, WSH: 15, CHI: 16, DET: 17, NSH: 18, STL: 19, CGY: 20,
  COL: 21, EDM: 22, VAN: 23, ANA: 24, DAL: 25, LAK: 26, SJS: 28, CBJ: 29, MIN: 30,
  WPG: 52, VGK: 54, SEA: 55, UTA: 68,
};

const AREAS = ["all", "high", "mid", "long"] as const;

const num = (v: number | null | undefined, digits: number) => (v == null || !Number.isFinite(v) ? null : round(v, digits));

function metric(value: number | null | undefined, leagueAverage: number | null | undefined, percentile: number | null | undefined, rank: number | null | undefined, digits: number): TrackingMetric {
  return {
    value: num(value, digits),
    leagueAverage: num(leagueAverage, digits),
    percentile: num(percentile, 3),
    rank: rank ?? null,
  };
}

function measure(m: NhlEdgeMeasure | null | undefined, digits: number): TrackingMetric {
  return metric(m?.imperial, m?.leagueAvg?.imperial, m?.percentile, m?.rank, digits);
}

function count(c: NhlEdgeCount | null | undefined): TrackingMetric {
  const avg = typeof c?.leagueAvg === "number" ? c.leagueAvg : c?.leagueAvg?.value;
  return metric(c?.value, avg, c?.percentile, c?.rank, 1);
}

export function peak(m: NhlEdgeMeasure | null | undefined, digits: number, withPlayer = false): TrackingPeak {
  const o = m?.overlay;
  const name = [o?.player?.firstName?.default, o?.player?.lastName?.default].filter(Boolean).join(" ");
  return {
    ...measure(m, digits),
    moment: o?.gameDate
      ? {
          gameDate: o.gameDate,
          away: o.awayTeam?.abbrev ?? null,
          home: o.homeTeam?.abbrev ?? null,
          period: o.periodDescriptor?.number ?? null,
          timeInPeriod: o.timeInPeriod ?? null,
          playerName: withPlayer && name ? name : null,
        }
      : null,
  };
}

export function shotAreas(rows: NhlEdgeSogSummary[] | undefined): TrackingShotArea[] {
  return AREAS.flatMap((area) => {
    const r = rows?.find((x) => x.locationCode === area);
    if (!r) return [];
    return [{
      area,
      shots: metric(r.shots, r.shotsLeagueAvg, r.shotsPercentile, r.shotsRank, 1),
      goals: metric(r.goals, r.goalsLeagueAvg, r.goalsPercentile, r.goalsRank, 2),
      shootingPct: metric(r.shootingPctg, r.shootingPctgLeagueAvg, r.shootingPctgPercentile, r.shootingPctgRank, 4),
    }];
  });
}

export function zoneTime(z: NhlEdgeZoneTime | null | undefined): TrackingZoneTime {
  return {
    offensive: metric(z?.offensiveZonePctg, z?.offensiveZoneLeagueAvg, z?.offensiveZonePercentile, z?.offensiveZoneRank, 4),
    neutral: metric(z?.neutralZonePctg, z?.neutralZoneLeagueAvg, z?.neutralZonePercentile, z?.neutralZoneRank, 4),
    defensive: metric(z?.defensiveZonePctg, z?.defensiveZoneLeagueAvg, z?.defensiveZonePercentile, z?.defensiveZoneRank, 4),
  };
}

export function rinkAreas(rows: NhlEdgeAreaDetail[] | undefined, goalie = false): TrackingArea[] {
  return (rows ?? [])
    .filter((r) => r.area)
    .map((r) => ({
      area: r.area!,
      value: goalie ? num(r.savePctg, 4) : (r.shots ?? null),
      percentile: num(goalie ? r.savePctgPercentile : r.shotsPercentile, 3),
      rank: goalie ? null : (r.shotsRank ?? null),
      saves: goalie ? (r.saves ?? null) : null,
    }));
}

// The season the numbers cover: the asked-for one, else the latest
// regular season the NHL lists (its "now" falls back to that). Start year.
export function trackingSeason(response: NhlEdgeSeasons, requested: number | undefined): number | null {
  if (requested !== undefined) return requested;
  const ids = (response.seasonsWithEdgeStats ?? [])
    .filter((s) => s.id && s.gameTypes?.includes(2))
    .map((s) => s.id!);
  return ids.length > 0 ? Math.floor(Math.max(...ids) / 10000) : null;
}

// EDGE starts in 2021-22.
const FIRST_EDGE_SEASON = 2021;

function seasonParam(ctx: ApiContext): number | undefined {
  const season = ctx.query.int("season");
  if (season !== undefined && (season < FIRST_EDGE_SEASON || season > 2100)) {
    throw new HttpError(400, { error: `season must be ${FIRST_EDGE_SEASON} or later`, code: "INVALID_PARAMETER" });
  }
  return season;
}

export async function getPlayerTracking(ctx: ApiContext): Promise<PlayerTrackingResponse> {
  const player = await requirePlayer(ctx.db, ctx.params.id);
  const requested = seasonParam(ctx);

  if (player.position === "G") {
    const d = await getEdgeGoalieDetail(player.id, requested);
    const season = d && trackingSeason(d, requested);
    if (!d || season === null || !d.shotLocationSummary?.length) return { tracking: null };
    const stat = (key: string, digits: number) => {
      const s = d.stats?.[key];
      return metric(s?.value, s?.leagueAvg, s?.percentile, null, digits);
    };
    const tracking: GoalieTracking = {
      kind: "goalie",
      season,
      gamesPlayed: d.player?.gamesPlayed ?? null,
      areas: AREAS.flatMap((area) => {
        const r = d.shotLocationSummary?.find((x) => x.locationCode === area);
        return r
          ? [{ area, saves: r.saves ?? 0, goalsAgainst: r.goalsAgainst ?? 0, savePct: metric(r.savePctg, r.savePctgLeagueAvg, r.savePctgPercentile, null, 4) }]
          : [];
      }),
      gamesAbove900: stat("gamesAbove900", 3),
      goalDifferentialPer60: stat("goalDifferentialPer60", 2),
      goalSupport: stat("goalSupportAvg", 2),
      rinkAreas: rinkAreas(d.shotLocationDetails, true),
    };
    return { tracking };
  }

  const d = await getEdgeSkaterDetail(player.id, requested);
  const season = d && trackingSeason(d, requested);
  if (!d || season === null || !d.skatingSpeed?.speedMax) return { tracking: null };
  const tracking: SkaterTracking = {
    kind: "skater",
    season,
    gamesPlayed: d.player?.gamesPlayed ?? null,
    topSpeed: peak(d.skatingSpeed.speedMax, 2),
    burstsOver20: count(d.skatingSpeed.burstsOver20),
    totalDistance: measure(d.totalDistanceSkated, 2),
    maxGameDistance: peak(d.distanceMaxGame, 2),
    hardestShot: peak(d.topShotSpeed, 1),
    shotAreas: shotAreas(d.sogSummary),
    zoneTime: zoneTime(d.zoneTimeDetails),
    rinkAreas: rinkAreas(d.sogDetails),
  };
  return { tracking };
}

export async function getTeamTracking(ctx: ApiContext): Promise<TeamTrackingResponse> {
  const abbrev = ctx.params.abbrev?.toUpperCase() ?? "";
  const teamId = NHL_TEAM_IDS[abbrev];
  if (teamId === undefined) throw new HttpError(404, { error: "Team not found", code: "TEAM_NOT_FOUND" });
  const requested = seasonParam(ctx);

  const d = await getEdgeTeamDetail(teamId, requested);
  const season = d && trackingSeason(d, requested);
  if (!d || season === null || !d.skatingSpeed?.speedMax) return { tracking: null };
  const tracking: TeamTracking = {
    season,
    gamesPlayed: d.team?.gamesPlayed ?? null,
    topSpeed: peak(d.skatingSpeed.speedMax, 2, true),
    burstsOver20: count(d.skatingSpeed.burstsOver20),
    burstsOver22: count(d.skatingSpeed.burstsOver22),
    totalDistance: measure(d.distanceSkated?.total, 1),
    hardestShot: peak(d.shotSpeed?.topShotSpeed, 1, true),
    shotsOver90: count(d.shotSpeed?.shotAttemptsOver90),
    shotAreas: shotAreas(d.sogSummary),
    zoneTime: zoneTime(d.zoneTimeDetails),
    rinkAreas: rinkAreas(d.sogDetails),
  };
  return { tracking };
}

// The EDGE top 10s on the tracking leaders page. `path` takes the position
// ("all", "F" or "D"); `value` reads the stat from a row.
const LEADER_BOARDS: {
  key: string;
  title: string;
  unit: string;
  path: (pos: string) => string;
  value: (r: NhlEdgeLeader) => number | null | undefined;
  detail?: (r: NhlEdgeLeader) => string | null;
  peak?: (r: NhlEdgeLeader) => NhlEdgeMeasure | null | undefined;
}[] = [
  {
    key: "speed",
    title: "Top skating speed",
    unit: "mph",
    path: (pos) => `skater-speed-top-10/${pos}/max`,
    value: (r) => r.maxSpeed?.imperial,
    detail: (r) => (r.burstsOver22 != null ? `${r.burstsOver22} bursts over 22 mph` : null),
    peak: (r) => r.maxSpeed,
  },
  {
    key: "shot",
    title: "Hardest shot",
    unit: "mph",
    path: (pos) => `skater-shot-speed-top-10/${pos}/max`,
    value: (r) => r.hardestShot?.imperial,
    detail: (r) => (r.shotAttemptsOver100 ? `${r.shotAttemptsOver100} over 100 mph` : null),
    peak: (r) => r.hardestShot,
  },
  {
    key: "distance",
    title: "Distance skated",
    unit: "mi",
    path: (pos) => `skater-distance-top-10/${pos}/all/total`,
    value: (r) => r.distanceTotal?.imperial,
    detail: (r) => (r.distancePer60?.imperial != null ? `${r.distancePer60.imperial.toFixed(1)} mi per 60` : null),
  },
  {
    key: "distancePer60",
    title: "Distance per 60 minutes",
    unit: "mi",
    path: (pos) => `skater-distance-top-10/${pos}/all/per-60`,
    value: (r) => r.distancePer60?.imperial,
    detail: (r) => (r.distanceTotal?.imperial != null ? `${r.distanceTotal.imperial.toFixed(0)} mi in all` : null),
  },
  {
    key: "highDanger",
    title: "High-danger shots on goal",
    unit: "",
    path: (pos) => `skater-shot-location-top-10/${pos}/sog/high`,
    value: (r) => r.highDanger,
    detail: (r) => (r.all != null ? `${r.all} shots on goal in all` : null),
  },
  {
    key: "offensiveZone",
    title: "Offensive-zone time",
    unit: "%",
    path: (pos) => `skater-zone-time-top-10/${pos}/all/offensive`,
    value: (r) => r.offensiveZoneTime,
  },
];

// "connor-mcdavid-8478402" -> 8478402
export function idFromSlug(slug: string | null | undefined): number | null {
  const match = slug?.match(/-(\d{7})$/);
  return match ? Number(match[1]) : null;
}

export function toLeaderBoard(board: (typeof LEADER_BOARDS)[number], rows: NhlEdgeLeader[]): TrackingLeaderBoard {
  return {
    key: board.key,
    title: board.title,
    unit: board.unit,
    leaders: rows.flatMap((r) => {
      const value = board.value(r);
      if (value == null) return [];
      const name = [r.player?.firstName?.default, r.player?.lastName?.default].filter(Boolean).join(" ");
      return [{
        playerId: idFromSlug(r.player?.slug),
        name,
        team: r.player?.team?.abbrev ?? null,
        position: r.player?.position ?? null,
        headshot: r.player?.headshot ?? null,
        value: round(value, board.unit === "%" ? 4 : board.unit === "" ? 0 : 2),
        detail: board.detail?.(r) ?? null,
        moment: board.peak ? peak(board.peak(r), 2).moment : null,
      }];
    }),
  };
}

const POSITIONS: readonly TrackingLeaderPosition[] = ["all", "F", "D"];

export async function getTrackingLeaders(ctx: ApiContext): Promise<TrackingLeadersResponse> {
  const raw = ctx.query.string("position") ?? "all";
  const position = POSITIONS.find((p) => p.toLowerCase() === raw.toLowerCase());
  if (!position) throw new HttpError(400, { error: "position must be all, F or D", code: "INVALID_PARAMETER" });
  // Default: the season in progress, else the last one with data.
  const requested = seasonParam(ctx);
  let season = requested ?? currentSeason();
  let lists = await Promise.all(LEADER_BOARDS.map((b) => getEdgeTop10(b.path(position), season)));
  if (requested === undefined && lists.every((l) => !l?.length) && season > FIRST_EDGE_SEASON) {
    season -= 1;
    lists = await Promise.all(LEADER_BOARDS.map((b) => getEdgeTop10(b.path(position), season)));
  }
  if (lists.every((l) => l === null)) {
    throw new HttpError(502, { error: "NHL EDGE is unavailable", code: "UPSTREAM_UNAVAILABLE" });
  }
  return {
    season,
    position,
    boards: LEADER_BOARDS.map((b, i) => toLeaderBoard(b, lists[i] ?? [])).filter((b) => b.leaders.length > 0),
  };
}
