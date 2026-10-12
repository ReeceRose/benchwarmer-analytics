// Game centre model for /api/games/{gameId}/live, built from the NHL API's
// live feeds. Everything attempt-based (Corsi, xG, high-danger, on-ice, lines)
// is derived from play-by-play and shift charts, so it works mid-game.
//
// The xG here is a small distance/angle/shot-type model, not MoneyPuck's: it
// exists so live games have a chance-quality measure. Completed games still
// get MoneyPuck xG on the shot map and deserve-to-win charts.

import { asc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { shots as shotsTable } from "@/server/db/schema";
import { HttpError } from "@/server/api/errors";
import { CacheTier, json, type ApiContext } from "@/server/api/handler";
import { isFinalState } from "@/server/api/constants";
import { round } from "@/server/api/format";
import {
  getBoxscore,
  getClubStats,
  getGameLanding,
  getPlayByPlay,
  getRightRail,
  getShiftChart,
  getStandings,
  type Localized,
  type NhlBoxscore,
  type NhlClubStats,
  type NhlGameLanding,
  type NhlIceSurfacePlayer,
  type NhlPlay,
  type NhlPlayByPlay,
  type NhlRightRail,
  type NhlShift,
  type NhlTeamStandings,
} from "@/server/api/nhl-client";
import type {
  LiveGameResponse,
  LiveGoal,
  LiveGoalie,
  LiveOnIcePlayer,
  LivePenalty,
  LivePuckEvent,
  LiveSeasonContext,
  LiveShot,
  LiveSkater,
  LiveTeamCounts,
  LiveTeamStats,
  LiveUnit,
  PuckEventType,
  ShotResult,
  StrengthSegment,
  StrengthState,
  TeamSide,
} from "@/types/game-live";

const SIDES: readonly TeamSide[] = ["away", "home"];
const opposite = (side: TeamSide): TeamSide => (side === "away" ? "home" : "away");
const teamKey = (side: TeamSide) => (side === "away" ? "awayTeam" : "homeTeam") as "awayTeam" | "homeTeam";
const text = (value: Localized | string | null | undefined): string =>
  typeof value === "string" ? value : (value?.default ?? "");

export function clockSeconds(mmss: string | null | undefined): number {
  const [m, s] = (mmss ?? "0:0").split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

/** Game seconds from the start of period 1 (OT periods continue at 1200 per period). */
export function gameSeconds(period: number, mmss: string | null | undefined): number {
  return (period - 1) * 1200 + clockSeconds(mmss);
}

// --- strength -------------------------------------------------------------

interface Situation {
  awayGoalie: number;
  awaySkaters: number;
  homeSkaters: number;
  homeGoalie: number;
}

/** Situation codes are four digits: away goalie, away skaters, home skaters, home goalie. */
export function parseSituation(code: string | null | undefined): Situation | null {
  if (!code || !/^\d{4}$/.test(code)) return null;
  const [awayGoalie, awaySkaters, homeSkaters, homeGoalie] = code.split("").map(Number);
  return { awayGoalie, awaySkaters, homeSkaters, homeGoalie };
}

/** Label ("5v4", "6v5 EN") and state from `side`'s point of view. */
export function strengthFor(code: string | null | undefined, side: TeamSide): { label: string; state: StrengthState } {
  const s = parseSituation(code);
  if (!s) return { label: "5v5", state: "EV" };
  const own = side === "home" ? s.homeSkaters : s.awaySkaters;
  const opp = side === "home" ? s.awaySkaters : s.homeSkaters;
  const oppGoalie = side === "home" ? s.awayGoalie : s.homeGoalie;
  if (oppGoalie === 0) return { label: `${own}v${opp} EN`, state: "EN" };
  // Our own pulled goalie adds a skater; that is still even strength.
  const ownGoalie = side === "home" ? s.homeGoalie : s.awayGoalie;
  const ownAdj = ownGoalie === 0 ? own - 1 : own;
  return { label: `${own}v${opp}`, state: ownAdj === opp ? "EV" : ownAdj > opp ? "PP" : "SH" };
}

// --- xG -------------------------------------------------------------------

const SHOT_TYPE_ADJUSTMENT: Record<string, number> = {
  "tip-in": 0.35,
  deflected: 0.3,
  backhand: -0.1,
  slap: 0.05,
  "wrap-around": -0.2,
  bat: 0.1,
  "between-legs": 0.1,
  cradle: 0.2,
};

/**
 * Rough goal probability for an unblocked attempt. Logistic in distance and
 * angle with bumps for shot type, rebounds (within 3s of the team's previous
 * attempt) and the power play. The intercept and distance slope were fitted to
 * 21 games from October 2026, with totals matched to MoneyPuck's xG for the
 * same games: ~14% from 10ft in the slot, ~8% from 30ft, ~3% from 60ft.
 */
export function expectedGoal(input: { distance: number; angle: number; shotType: string | null; rebound: boolean; state: StrengthState }): number {
  let logit = -1.42 - 0.036 * input.distance - 0.012 * input.angle;
  logit += SHOT_TYPE_ADJUSTMENT[input.shotType ?? ""] ?? 0;
  if (input.rebound) logit += 0.9;
  if (input.state === "PP") logit += 0.3;
  const p = 1 / (1 + Math.exp(-logit));
  return input.state === "EN" ? Math.max(p, 0.6) : p;
}

/** Inner slot and crease: inside the faceoff dots and below the hash marks. */
export function isHighDanger(x: number, y: number): boolean {
  return x > 54 && x < 89 && Math.abs(y) < 22 && Math.hypot(89 - x, y) < 29;
}

// --- builder --------------------------------------------------------------

export interface LiveGameInputs {
  gameId: string;
  landing: NhlGameLanding | null;
  boxscore: NhlBoxscore | null;
  playByPlay: NhlPlayByPlay;
  rightRail: NhlRightRail | null;
  shifts: NhlShift[];
  standings: Map<string, NhlTeamStandings>;
  clubStats: Partial<Record<TeamSide, NhlClubStats | null>>;
  /** MoneyPuck shots for a final game; when present, their xG replaces the model's. */
  referenceXg?: ReferenceShot[];
  now?: Date;
}

export interface ReferenceShot {
  team: TeamSide;
  /** Game seconds. */
  t: number;
  shooterId: number | null;
  xg: number;
}

/**
 * Replaces model xG with MoneyPuck's on unblocked attempts. Pass one pairs
 * same team and shooter within 6 seconds, nearest first (nearly all match to
 * the second; the feeds sometimes disagree by a few seconds late in games).
 * Pass two pairs what's left by team within 2 seconds, since the feeds
 * occasionally credit different shooters. Attempts MoneyPuck doesn't have get
 * 0, so totals agree with MoneyPuck's. Each MoneyPuck shot is used once.
 */
export function applyReferenceXg(
  shots: { team: TeamSide; t: number; shooterId: number | null; result: ShotResult; xg: number | null }[],
  reference: readonly ReferenceShot[],
): void {
  const usedRef = new Set<number>();
  const matched = new Set<number>();
  const unblocked = shots.map((s, i) => [s, i] as const).filter(([s]) => s.result !== "BLOCK");
  // Closest pairs first across the whole game, so one attempt can't take
  // another's exact match.
  const pass = (fits: (r: ReferenceShot, s: (typeof shots)[number]) => boolean) => {
    const pairs: [number, number, number][] = [];
    for (const [s, i] of unblocked) {
      if (matched.has(i)) continue;
      reference.forEach((r, j) => {
        if (!usedRef.has(j) && r.team === s.team && fits(r, s)) pairs.push([Math.abs(r.t - s.t), i, j]);
      });
    }
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    for (const [, i, j] of pairs) {
      if (matched.has(i) || usedRef.has(j)) continue;
      matched.add(i);
      usedRef.add(j);
      shots[i].xg = round(reference[j].xg, 3);
    }
  };
  pass((r, s) => s.shooterId != null && r.shooterId === s.shooterId && Math.abs(r.t - s.t) <= 6);
  pass((r, s) => Math.abs(r.t - s.t) <= 2);
  const unmatched = unblocked.filter(([, i]) => !matched.has(i)).map(([s]) => s);
  for (const s of unmatched) s.xg = 0;
}

interface RosterEntry {
  id: number;
  side: TeamSide;
  number: number;
  name: string;
  position: string;
}

const SHOT_RESULTS: Record<string, ShotResult> = {
  "shot-on-goal": "SOG",
  "missed-shot": "MISS",
  "blocked-shot": "BLOCK",
  goal: "GOAL",
};

const PUCK_EVENTS = new Set<PuckEventType>(["hit", "giveaway", "takeaway", "faceoff", "penalty"]);

function emptyCounts(): LiveTeamCounts {
  return {
    goals: 0, xg: 0, attempts: 0, unblocked: 0, shotsOnGoal: 0, highDanger: 0, missed: 0, blockedByOpponent: 0,
    blocks: 0, hits: 0, giveaways: 0, takeaways: 0, faceoffWins: 0, penaltyMinutes: 0,
  };
}

function emptyTeamStats(): LiveTeamStats {
  return {
    all: emptyCounts(),
    byPeriod: {},
    byStrength: {},
    timeByStrength: {},
    faceoffsByZone: { O: { won: 0, lost: 0 }, N: { won: 0, lost: 0 }, D: { won: 0, lost: 0 } },
    shotTypes: {},
    missReasons: {},
  };
}

function roundCounts(c: LiveTeamCounts): LiveTeamCounts {
  return { ...c, xg: round(c.xg, 2) };
}

function record(w: number | undefined, l: number | undefined, ot: number | undefined): string {
  return `${w ?? 0}-${l ?? 0}-${ot ?? 0}`;
}

function seasonContext(standing: NhlTeamStandings | undefined, club: NhlClubStats | null | undefined): LiveSeasonContext | null {
  if (!standing) return null;
  const scorers = [...(club?.skaters ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.goals ?? 0) - (a.goals ?? 0))
    .slice(0, 5);
  return {
    gamesPlayed: standing.gamesPlayed ?? 0,
    wins: standing.wins ?? 0,
    losses: standing.losses ?? 0,
    otLosses: standing.otLosses ?? 0,
    points: standing.points ?? 0,
    pointPct: standing.pointPctg ?? null,
    goalsFor: standing.goalFor ?? 0,
    goalsAgainst: standing.goalAgainst ?? 0,
    goalDifferential: standing.goalDifferential ?? 0,
    streak: standing.streakCode ? `${standing.streakCode}${standing.streakCount ?? ""}` : null,
    homeRecord: record(standing.homeWins, standing.homeLosses, standing.homeOtLosses),
    roadRecord: record(standing.roadWins, standing.roadLosses, standing.roadOtLosses),
    last10: record(standing.l10Wins, standing.l10Losses, standing.l10OtLosses),
    division: standing.divisionName ?? null,
    divisionRank: standing.divisionSequence ?? null,
    leagueRank: standing.leagueSequence ?? null,
    topScorers: scorers.map((p) => ({
      name: `${text(p.firstName).slice(0, 1)}. ${text(p.lastName)}`,
      gamesPlayed: p.gamesPlayed ?? 0,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      points: p.points ?? 0,
      plusMinus: p.plusMinus ?? 0,
    })),
  };
}

export function buildLiveGame(input: LiveGameInputs): LiveGameResponse {
  const { landing, boxscore, playByPlay: pbp, rightRail } = input;
  const sideByTeamId = new Map<number, TeamSide>();
  if (pbp.awayTeam?.id != null) sideByTeamId.set(pbp.awayTeam.id, "away");
  if (pbp.homeTeam?.id != null) sideByTeamId.set(pbp.homeTeam.id, "home");
  const abbrev: Record<TeamSide, string> = {
    away: pbp.awayTeam?.abbrev ?? landing?.awayTeam?.abbrev ?? "",
    home: pbp.homeTeam?.abbrev ?? landing?.homeTeam?.abbrev ?? "",
  };

  const roster = new Map<number, RosterEntry>();
  for (const r of pbp.rosterSpots ?? []) {
    const side = sideByTeamId.get(r.teamId ?? -1);
    if (r.playerId == null || !side) continue;
    roster.set(r.playerId, {
      id: r.playerId,
      side,
      number: r.sweaterNumber ?? 0,
      name: `${text(r.firstName).slice(0, 1)}. ${text(r.lastName)}`,
      position: r.positionCode ?? "",
    });
  }
  const nameOf = (id: number | null | undefined) => (id != null ? (roster.get(id)?.name ?? "—") : "—");

  // Plays in order, without the shootout.
  const plays = [...(pbp.plays ?? [])]
    .filter((p) => p.periodDescriptor?.periodType !== "SO")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const tOf = (p: NhlPlay) => gameSeconds(p.periodDescriptor?.number ?? 1, p.timeInPeriod);
  const elapsed = plays.reduce((m, p) => Math.max(m, tOf(p)), 0);

  // Which way each team attacks, per period.
  const homeDefends = new Map<number, string>();
  for (const p of plays) {
    const n = p.periodDescriptor?.number;
    if (n != null && p.homeTeamDefendingSide && !homeDefends.has(n)) homeDefends.set(n, p.homeTeamDefendingSide);
  }
  const attacksPositive = (side: TeamSide, period: number) => {
    let defends = homeDefends.get(period);
    if (!defends) {
      // Teams switch ends each period; infer from period 1 if this one is missing.
      const first = homeDefends.get(1) ?? "left";
      defends = period % 2 === 1 ? first : first === "left" ? "right" : "left";
    }
    return (defends === "left") === (side === "home");
  };
  const normalize = (side: TeamSide, period: number, x: number | null | undefined, y: number | null | undefined) => {
    if (x == null || y == null) return { x: null, y: null };
    return attacksPositive(side, period) ? { x, y } : { x: -x, y: -y };
  };

  // Situation code in force at each second (from play-by-play).
  const situationAt: (string | null)[] = new Array(elapsed + 1).fill(null);
  {
    let current: string | null = null;
    let i = 0;
    for (let t = 0; t <= elapsed; t++) {
      while (i < plays.length && tOf(plays[i]) <= t) {
        current = plays[i].situationCode ?? current;
        i++;
      }
      situationAt[t] = current;
    }
  }

  // Who was on the ice each second (from shift charts).
  const shiftRows = input.shifts.filter(
    (s) => s.typeCode === 517 && s.playerId != null && roster.has(s.playerId) && s.startTime && s.endTime && s.period,
  );
  const onIce: Record<TeamSide, Set<number>>[] = [];
  const shifts = shiftRows.map((s) => ({
    playerId: s.playerId!,
    start: gameSeconds(s.period!, s.startTime),
    end: gameSeconds(s.period!, s.endTime),
  }));
  for (const s of shifts) {
    const side = roster.get(s.playerId)!.side;
    for (let t = s.start; t < s.end; t++) {
      onIce[t] ??= { away: new Set(), home: new Set() };
      onIce[t][side].add(s.playerId);
    }
  }
  // An event at second t counts players on during [t-1, t).
  const onIceAt = (t: number) => onIce[Math.max(t - 1, 0)] ?? { away: new Set<number>(), home: new Set<number>() };

  // --- shots ---
  const shots: LiveShot[] = [];
  const lastAttempt: Record<TeamSide, number> = { away: -99, home: -99 };
  for (const p of plays) {
    const result = SHOT_RESULTS[p.typeDescKey ?? ""];
    if (!result) continue;
    const d = p.details ?? {};
    const shooterId = d.shootingPlayerId ?? d.scoringPlayerId ?? null;
    const side = (shooterId != null ? roster.get(shooterId)?.side : undefined) ?? sideByTeamId.get(d.eventOwnerTeamId ?? -1);
    if (!side) continue;
    const period = p.periodDescriptor?.number ?? 1;
    const t = tOf(p);
    const { x, y } = normalize(side, period, d.xCoord, d.yCoord);
    const { label, state } = strengthFor(p.situationCode, side);
    const rebound = t - lastAttempt[side] <= 3;
    lastAttempt[side] = t;
    let distance: number | null = null;
    let angle: number | null = null;
    let xg: number | null = null;
    if (x != null && y != null) {
      distance = Math.hypot(89 - x, y);
      angle = x < 89 ? Math.abs((Math.atan2(y, 89 - x) * 180) / Math.PI) : 90;
      if (result !== "BLOCK") xg = expectedGoal({ distance, angle, shotType: d.shotType ?? null, rebound, state });
    }
    const ice = onIceAt(t);
    shots.push({
      t,
      period,
      timeInPeriod: p.timeInPeriod ?? "",
      team: side,
      result,
      x,
      y,
      distance: distance == null ? null : round(distance, 1),
      angle: angle == null ? null : round(angle),
      shotType: d.shotType ?? null,
      missReason: result === "MISS" ? (d.reason ?? null) : null,
      shooterId,
      shooter: nameOf(shooterId),
      goalieId: d.goalieInNetId ?? null,
      goalie: d.goalieInNetId != null ? nameOf(d.goalieInNetId) : null,
      blocker: d.blockingPlayerId != null ? nameOf(d.blockingPlayerId) : null,
      strength: label,
      state,
      xg: xg == null ? null : round(xg, 3),
      highDanger: x != null && y != null && result !== "BLOCK" && isHighDanger(x, y),
      rebound,
      onIceFor: [...ice[side]],
      onIceAgainst: [...ice[opposite(side)]],
      highlightUrl: d.highlightClipSharingUrl ?? null,
    });
  }

  if (input.referenceXg?.length) applyReferenceXg(shots, input.referenceXg);

  // --- faceoffs, hits, giveaways, takeaways, penalties ---
  const events: LivePuckEvent[] = [];
  for (const p of plays) {
    const type = p.typeDescKey as PuckEventType;
    if (!PUCK_EVENTS.has(type)) continue;
    const d = p.details ?? {};
    const side = sideByTeamId.get(d.eventOwnerTeamId ?? -1);
    if (!side) continue;
    const period = p.periodDescriptor?.number ?? 1;
    const actor = d.hittingPlayerId ?? d.winningPlayerId ?? d.committedByPlayerId ?? d.playerId ?? null;
    const other = d.hitteePlayerId ?? d.losingPlayerId ?? d.drawnByPlayerId ?? null;
    const zone = d.zoneCode === "O" || d.zoneCode === "N" || d.zoneCode === "D" ? d.zoneCode : null;
    events.push({
      t: tOf(p),
      period,
      timeInPeriod: p.timeInPeriod ?? "",
      type,
      team: side,
      ...normalize(side, period, d.xCoord, d.yCoord),
      // The NHL reports a penalty's zone from the penalized team's point of view too.
      zone,
      player: nameOf(actor),
      playerId: actor,
      opponent: other != null ? nameOf(other) : null,
      opponentId: other,
    });
  }

  const stoppages: Record<string, number> = {};
  for (const p of plays) {
    if (p.typeDescKey !== "stoppage") continue;
    const reason = (p.details?.reason ?? "other").replace(/-/g, " ");
    stoppages[reason] = (stoppages[reason] ?? 0) + 1;
  }

  // --- team aggregates ---
  const stats: Record<TeamSide, LiveTeamStats> = { away: emptyTeamStats(), home: emptyTeamStats() };
  const buckets = (side: TeamSide, period: number, state: StrengthState | null) => {
    const s = stats[side];
    const out = [s.all, (s.byPeriod[period] ??= emptyCounts())];
    if (state) out.push((s.byStrength[state] ??= emptyCounts()));
    return out;
  };
  for (const s of shots) {
    const team = stats[s.team];
    for (const c of buckets(s.team, s.period, s.state)) {
      c.attempts++;
      if (s.result !== "BLOCK") {
        c.unblocked++;
        c.xg += s.xg ?? 0;
        if (s.highDanger) c.highDanger++;
      }
      if (s.result === "SOG" || s.result === "GOAL") c.shotsOnGoal++;
      if (s.result === "GOAL") c.goals++;
      if (s.result === "MISS") c.missed++;
      if (s.result === "BLOCK") c.blockedByOpponent++;
    }
    if (s.result === "BLOCK") {
      const defending = opposite(s.team);
      for (const c of buckets(defending, s.period, strengthFor(situationAt[s.t], defending).state)) c.blocks++;
    }
    if (s.shotType) team.shotTypes[s.shotType] = (team.shotTypes[s.shotType] ?? 0) + 1;
    if (s.missReason) team.missReasons[s.missReason] = (team.missReasons[s.missReason] ?? 0) + 1;
  }
  for (const e of events) {
    const state = strengthFor(situationAt[e.t], e.team).state;
    for (const c of buckets(e.team, e.period, state)) {
      if (e.type === "hit") c.hits++;
      if (e.type === "giveaway") c.giveaways++;
      if (e.type === "takeaway") c.takeaways++;
      if (e.type === "faceoff") c.faceoffWins++;
    }
    if (e.type === "faceoff" && e.zone) {
      stats[e.team].faceoffsByZone[e.zone].won++;
      const flipped = e.zone === "O" ? "D" : e.zone === "D" ? "O" : "N";
      stats[opposite(e.team)].faceoffsByZone[flipped].lost++;
    }
  }
  // Penalty minutes from the play-by-play penalty durations.
  for (const p of plays) {
    if (p.typeDescKey !== "penalty") continue;
    const side = sideByTeamId.get(p.details?.eventOwnerTeamId ?? -1);
    if (!side) continue;
    for (const c of buckets(side, p.periodDescriptor?.number ?? 1, null)) c.penaltyMinutes += p.details?.duration ?? 0;
  }

  // Time at each strength, and stretches of non-5v5 play.
  const timeBySkaters: Record<string, number> = {};
  const strengthSegments: StrengthSegment[] = [];
  for (let t = 0; t < elapsed; t++) {
    const code = situationAt[t];
    for (const side of SIDES) {
      const state = strengthFor(code, side).state;
      stats[side].timeByStrength[state] = (stats[side].timeByStrength[state] ?? 0) + 1;
    }
    const s = parseSituation(code);
    if (!s) continue;
    const key = `${s.awaySkaters}v${s.homeSkaters}`;
    timeBySkaters[key] = (timeBySkaters[key] ?? 0) + 1;
    const isFiveOnFive = s.awaySkaters === 5 && s.homeSkaters === 5 && s.awayGoalie === 1 && s.homeGoalie === 1;
    if (isFiveOnFive) continue;
    const last = strengthSegments.at(-1);
    if (last && last.end === t && last.homeSkaters === s.homeSkaters && last.awaySkaters === s.awaySkaters
      && last.emptyNet === (s.awayGoalie === 0 || s.homeGoalie === 0)) {
      last.end = t + 1;
      continue;
    }
    const homeAdj = s.homeGoalie === 0 ? s.homeSkaters - 1 : s.homeSkaters;
    const awayAdj = s.awayGoalie === 0 ? s.awaySkaters - 1 : s.awaySkaters;
    strengthSegments.push({
      start: t,
      end: t + 1,
      homeSkaters: s.homeSkaters,
      awaySkaters: s.awaySkaters,
      advantage: homeAdj > awayAdj ? "home" : awayAdj > homeAdj ? "away" : null,
      emptyNet: s.awayGoalie === 0 || s.homeGoalie === 0,
    });
  }

  // --- per player ---
  interface Acc {
    attempts: number; unblocked: number; ixg: number; highDanger: number;
    cf: number; ca: number; xgf: number; xga: number; gf: number; ga: number; evcf: number; evca: number;
    hits: number; hitsTaken: number; fow: number; fol: number; drawn: number; taken: number;
    toi: Record<StrengthState, number>;
  }
  const acc = new Map<number, Acc>();
  const accFor = (id: number) => {
    let a = acc.get(id);
    if (!a) {
      a = {
        attempts: 0, unblocked: 0, ixg: 0, highDanger: 0, cf: 0, ca: 0, xgf: 0, xga: 0, gf: 0, ga: 0, evcf: 0, evca: 0,
        hits: 0, hitsTaken: 0, fow: 0, fol: 0, drawn: 0, taken: 0, toi: { EV: 0, PP: 0, SH: 0, EN: 0 },
      };
      acc.set(id, a);
    }
    return a;
  };
  for (const s of shots) {
    const xg = s.result !== "BLOCK" ? (s.xg ?? 0) : 0;
    if (s.shooterId != null && roster.has(s.shooterId)) {
      const a = accFor(s.shooterId);
      a.attempts++;
      if (s.result !== "BLOCK") a.unblocked++;
      a.ixg += xg;
      if (s.highDanger) a.highDanger++;
    }
    for (const id of s.onIceFor) {
      const a = accFor(id);
      a.cf++; a.xgf += xg;
      if (s.result === "GOAL") a.gf++;
      if (s.state === "EV") a.evcf++;
    }
    for (const id of s.onIceAgainst) {
      const a = accFor(id);
      a.ca++; a.xga += xg;
      if (s.result === "GOAL") a.ga++;
      if (s.state === "EV") a.evca++;
    }
  }
  for (const e of events) {
    const actor = e.playerId != null && roster.has(e.playerId) ? accFor(e.playerId) : null;
    const other = e.opponentId != null && roster.has(e.opponentId) ? accFor(e.opponentId) : null;
    if (e.type === "hit") { if (actor) actor.hits++; if (other) other.hitsTaken++; }
    if (e.type === "faceoff") { if (actor) actor.fow++; if (other) other.fol++; }
    if (e.type === "penalty") { if (actor) actor.taken++; if (other) other.drawn++; }
  }
  for (let t = 0; t < onIce.length; t++) {
    const ice = onIce[t];
    if (!ice) continue;
    for (const side of SIDES) {
      const state = strengthFor(situationAt[Math.min(t, elapsed)], side).state;
      for (const id of ice[side]) accFor(id).toi[state]++;
    }
  }

  const skaters: LiveSkater[] = [];
  const goalies: LiveGoalie[] = [];
  for (const side of SIDES) {
    const team = boxscore?.playerByGameStats?.[teamKey(side)];
    for (const r of [...(team?.forwards ?? []), ...(team?.defense ?? [])]) {
      if (r.playerId == null) continue;
      const a = accFor(r.playerId);
      skaters.push({
        playerId: r.playerId,
        team: side,
        number: r.sweaterNumber ?? 0,
        name: text(r.name),
        position: r.position ?? "",
        goals: r.goals ?? 0,
        assists: r.assists ?? 0,
        points: r.points ?? 0,
        plusMinus: r.plusMinus ?? 0,
        pim: r.pim ?? 0,
        shotsOnGoal: r.sog ?? 0,
        hits: r.hits ?? 0,
        hitsTaken: a.hitsTaken,
        blocks: r.blockedShots ?? 0,
        giveaways: r.giveaways ?? 0,
        takeaways: r.takeaways ?? 0,
        faceoffWins: a.fow,
        faceoffLosses: a.fol,
        powerPlayGoals: r.powerPlayGoals ?? 0,
        toiSeconds: clockSeconds(r.toi),
        shifts: r.shifts ?? 0,
        toiEv: a.toi.EV,
        toiPp: a.toi.PP,
        toiSh: a.toi.SH,
        attempts: a.attempts,
        unblocked: a.unblocked,
        ixg: round(a.ixg, 2),
        highDanger: a.highDanger,
        onIceAttemptsFor: a.cf,
        onIceAttemptsAgainst: a.ca,
        onIceXgFor: round(a.xgf, 2),
        onIceXgAgainst: round(a.xga, 2),
        onIceGoalsFor: a.gf,
        onIceGoalsAgainst: a.ga,
        evAttemptsFor: a.evcf,
        evAttemptsAgainst: a.evca,
        penaltiesDrawn: a.drawn,
        penaltiesTaken: a.taken,
      });
    }
    const seasonGoalies = new Map((input.clubStats[side]?.goalies ?? []).map((g) => [g.playerId, g]));
    for (const g of team?.goalies ?? []) {
      if (g.playerId == null) continue;
      const faced = shots.filter((s) => s.team !== side && (s.result === "SOG" || s.result === "GOAL") && s.goalieId === g.playerId);
      const season = seasonGoalies.get(g.playerId);
      goalies.push({
        playerId: g.playerId,
        team: side,
        number: g.sweaterNumber ?? 0,
        name: text(g.name),
        toi: g.toi ?? "0:00",
        shotsAgainst: g.shotsAgainst ?? 0,
        saves: g.saves ?? 0,
        goalsAgainst: g.goalsAgainst ?? 0,
        savePct: g.savePctg ?? null,
        evenStrength: g.evenStrengthShotsAgainst ?? null,
        powerPlay: g.powerPlayShotsAgainst ?? null,
        shorthanded: g.shorthandedShotsAgainst ?? null,
        xgAgainst: round(faced.reduce((sum, s) => sum + (s.xg ?? 0), 0), 2),
        highDangerShots: faced.filter((s) => s.highDanger).length,
        highDangerGoals: faced.filter((s) => s.highDanger && s.result === "GOAL").length,
        decision: g.decision ?? null,
        season: season
          ? {
              gamesPlayed: season.gamesPlayed ?? 0,
              wins: season.wins ?? 0,
              gaa: round(season.goalsAgainstAverage ?? 0, 2),
              savePct: round(season.savePercentage ?? 0, 3),
              shutouts: season.shutouts ?? 0,
            }
          : null,
      });
    }
  }

  // --- forward lines and defence pairs at even strength ---
  const lines = Object.fromEntries(
    SIDES.map((side) => {
      const fwd = new Map<string, number>();
      const def = new Map<string, number>();
      for (let t = 0; t < onIce.length; t++) {
        const ice = onIce[t];
        if (!ice || strengthFor(situationAt[Math.min(t, elapsed)], side).state !== "EV") continue;
        const ids = [...ice[side]].sort((a, b) => a - b);
        const f = ids.filter((id) => ["C", "L", "R"].includes(roster.get(id)!.position));
        const d = ids.filter((id) => roster.get(id)!.position === "D");
        if (f.length === 3) fwd.set(f.join(","), (fwd.get(f.join(",")) ?? 0) + 1);
        if (d.length === 2) def.set(d.join(","), (def.get(d.join(",")) ?? 0) + 1);
      }
      const units = (counts: Map<string, number>, n: number): LiveUnit[] =>
        [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([key, seconds]) => {
            const ids = key.split(",").map(Number);
            const forUs = shots.filter((s) => s.team === side && ids.every((id) => s.onIceFor.includes(id)));
            const against = shots.filter((s) => s.team !== side && ids.every((id) => s.onIceAgainst.includes(id)));
            const xg = (list: LiveShot[]) => round(list.reduce((sum, s) => sum + (s.result !== "BLOCK" ? (s.xg ?? 0) : 0), 0), 2);
            return {
              players: ids.map(nameOf),
              seconds,
              attemptsFor: forUs.length,
              attemptsAgainst: against.length,
              xgFor: xg(forUs),
              xgAgainst: xg(against),
              goalsFor: forUs.filter((s) => s.result === "GOAL").length,
              goalsAgainst: against.filter((s) => s.result === "GOAL").length,
            };
          });
      return [side, { forwards: units(fwd, 5), defense: units(def, 4) }];
    }),
  ) as LiveGameResponse["lines"];

  // --- goals (landing summary, joined to play-by-play shots) ---
  const goalShots = shots.filter((s) => s.result === "GOAL");
  const goals: LiveGoal[] = [];
  for (const period of landing?.summary?.scoring ?? []) {
    const n = period.periodDescriptor?.number ?? 1;
    if (period.periodDescriptor?.periodType === "SO") continue;
    for (const g of period.goals ?? []) {
      const t = gameSeconds(n, g.timeInPeriod);
      const shot = goalShots.find((s) => s.t === t && (g.playerId == null || s.shooterId === g.playerId));
      const team: TeamSide = text(g.teamAbbrev) === abbrev.home ? "home" : "away";
      goals.push({
        t,
        period: n,
        timeInPeriod: g.timeInPeriod ?? "",
        team,
        scorer: text(g.name),
        scorerId: g.playerId ?? null,
        seasonGoals: g.goalsToDate ?? null,
        assists: (g.assists ?? []).map((a) => ({ name: text(a.name), seasonAssists: a.assistsToDate ?? null })),
        strength: g.strength ? g.strength.toUpperCase() : null,
        shotType: g.shotType ?? shot?.shotType ?? null,
        distance: shot?.distance ?? null,
        xg: shot?.xg ?? null,
        goalie: shot?.goalie ?? null,
        awayScore: g.awayScore ?? 0,
        homeScore: g.homeScore ?? 0,
        headshot: g.headshot ?? null,
        highlightUrl: g.highlightClipSharingUrl ?? shot?.highlightUrl ?? null,
      });
    }
  }

  // --- penalties (landing summary has names and who drew it) ---
  const penalties: LivePenalty[] = [];
  for (const period of landing?.summary?.penalties ?? []) {
    const n = period.periodDescriptor?.number ?? 1;
    for (const p of period.penalties ?? []) {
      const t = gameSeconds(n, p.timeInPeriod);
      const team: TeamSide = text(p.teamAbbrev) === abbrev.home ? "home" : "away";
      const minutes = p.duration ?? 0;
      const beneficiary = opposite(team);
      const window = shots.filter((s) => s.team === beneficiary && s.t > t && s.t <= t + minutes * 60 && s.state === "PP");
      const ppGoal = window.find((s) => s.result === "GOAL");
      const person = (x: { firstName?: Localized | null; lastName?: Localized | null } | null | undefined) =>
        x ? `${text(x.firstName).slice(0, 1)}. ${text(x.lastName)}` : null;
      penalties.push({
        t,
        period: n,
        timeInPeriod: p.timeInPeriod ?? "",
        team,
        player: person(p.committedByPlayer) ?? (p.servedBy ? `Served by ${text(p.servedBy)}` : "Team"),
        infraction: (p.descKey ?? "").replace(/-/g, " "),
        type: p.type ?? "",
        minutes,
        drawnBy: person(p.drawnBy),
        powerPlayGoal: ppGoal ? ppGoal.shooter : null,
        powerPlayAttempts: window.length,
        powerPlayXg: round(window.reduce((sum, s) => sum + (s.result !== "BLOCK" ? (s.xg ?? 0) : 0), 0), 2),
      });
    }
  }

  // --- right rail ---
  const teamGameStats = new Map((rightRail?.teamGameStats ?? []).map((s) => [s.category, s]));
  const gameInfo = rightRail?.gameInfo;
  const official = (o: { default?: string; fullName?: Localized; sweaterNumber?: number }) =>
    `${o.fullName ? text(o.fullName) : (o.default ?? "")}${o.sweaterNumber != null ? ` #${o.sweaterNumber}` : ""}`;
  const scratches = (side: TeamSide) =>
    (gameInfo?.[teamKey(side)]?.scratches ?? []).map((s) => `${text(s.firstName)} ${text(s.lastName)}`);

  const onIceNow = (players: NhlIceSurfacePlayer[] | undefined): LiveOnIcePlayer[] =>
    (players ?? []).map((p) => ({
      playerId: p.playerId ?? 0,
      number: p.sweaterNumber ?? 0,
      name: text(p.name),
      position: p.positionCode ?? "",
      headshot: p.headshot ?? null,
      toiSeconds: p.totalSOI ?? null,
    }));
  const surface = landing?.summary?.iceSurface;
  const onIceTeam = (side: TeamSide) => {
    const t = surface?.[teamKey(side)];
    return onIceNow([...(t?.forwards ?? []), ...(t?.defensemen ?? []), ...(t?.goalies ?? [])]);
  };

  const sit = landing?.situation;
  const situation = sit
    ? (() => {
        const awayDesc = sit.awayTeam?.situationDescriptions ?? [];
        const homeDesc = sit.homeTeam?.situationDescriptions ?? [];
        const powerPlayTeam: TeamSide | null = awayDesc.includes("PP") ? "away" : homeDesc.includes("PP") ? "home" : null;
        return {
          awaySkaters: sit.awayTeam?.strength ?? 5,
          homeSkaters: sit.homeTeam?.strength ?? 5,
          powerPlayTeam,
          timeRemaining: sit.timeRemaining ?? null,
          descriptions: [...awayDesc.map((d) => `${abbrev.away} ${d}`), ...homeDesc.map((d) => `${abbrev.home} ${d}`)],
        };
      })()
    : null;

  const teamInfo = (side: TeamSide) => {
    const t = landing?.[teamKey(side)];
    const name = [text(t?.placeName), text(t?.commonName)].filter(Boolean).join(" ");
    return {
      abbrev: abbrev[side],
      name: name || abbrev[side],
      score: t?.score ?? 0,
      shotsOnGoal: t?.sog ?? stats[side].all.shotsOnGoal,
      headCoach: text(gameInfo?.[teamKey(side)]?.headCoach) || null,
      scratches: scratches(side),
    };
  };

  const reportLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^toi/, "TOI").replace(/^./, (c) => c.toUpperCase());

  return {
    meta: {
      gameId: input.gameId,
      gameState: landing?.gameState ?? pbp.gameState ?? "",
      period: landing?.periodDescriptor?.number ?? 1,
      periodType: landing?.periodDescriptor?.periodType ?? null,
      timeRemaining: landing?.clock?.timeRemaining ?? null,
      clockRunning: landing?.clock?.running ?? false,
      inIntermission: landing?.clock?.inIntermission ?? false,
      elapsedSeconds: elapsed,
      venue: text(landing?.venue) || null,
      venueCity: text(landing?.venueLocation) || null,
      startTimeUtc: landing?.startTimeUTC ?? null,
      broadcasts: (landing?.tvBroadcasts ?? []).map(
        (b) => `${b.network ?? ""} (${b.countryCode ?? ""}${b.market === "H" ? ", home" : b.market === "A" ? ", away" : ""})`,
      ),
      eventCount: plays.length,
      shiftCount: shifts.length,
      updatedAt: (input.now ?? new Date()).toISOString(),
      xgSource: input.referenceXg?.length ? "moneypuck" : "model",
    },
    situation,
    away: teamInfo("away"),
    home: teamInfo("home"),
    stats: Object.fromEntries(
      SIDES.map((side) => {
        const s = stats[side];
        return [side, {
          ...s,
          all: roundCounts(s.all),
          byPeriod: Object.fromEntries(Object.entries(s.byPeriod).map(([k, v]) => [k, roundCounts(v)])),
          byStrength: Object.fromEntries(Object.entries(s.byStrength).map(([k, v]) => [k, roundCounts(v)])),
        }];
      }),
    ) as Record<TeamSide, LiveTeamStats>,
    timeBySkaters,
    strengthSegments,
    goals,
    shots,
    events,
    penalties,
    powerPlay: {
      away: teamGameStats.get("powerPlay")?.awayValue?.toString() ?? null,
      home: teamGameStats.get("powerPlay")?.homeValue?.toString() ?? null,
    },
    skaters,
    goalies,
    lines,
    shifts,
    roster: [...roster.values()].map((r) => ({ playerId: r.id, team: r.side, number: r.number, name: r.name, position: r.position })),
    onIce: { away: onIceTeam("away"), home: onIceTeam("home") },
    threeStars: (landing?.summary?.threeStars ?? []).map((s) => ({
      star: s.star ?? 0,
      name: text(s.name),
      team: text(s.teamAbbrev),
      position: s.position ?? null,
    })),
    stoppages,
    officials: {
      referees: (gameInfo?.referees ?? []).map(official),
      linesmen: (gameInfo?.linesmen ?? []).map(official),
    },
    seasonSeries: rightRail?.seasonSeriesWins
      ? { awayWins: rightRail.seasonSeriesWins.awayTeamWins ?? 0, homeWins: rightRail.seasonSeriesWins.homeTeamWins ?? 0 }
      : null,
    reports: Object.entries(rightRail?.gameReports ?? {}).map(([key, url]) => ({ label: reportLabel(key), url })),
    season: {
      away: seasonContext(input.standings.get(abbrev.away), input.clubStats.away),
      home: seasonContext(input.standings.get(abbrev.home), input.clubStats.home),
    },
  };
}

// MoneyPuck's shots for a game, or [] when it hasn't been ingested yet.
async function moneyPuckShots(db: Database, gameId: string): Promise<ReferenceShot[]> {
  const rows = await db
    .select({
      t: shotsTable.gameTimeSeconds,
      shooterId: shotsTable.shooterPlayerId,
      xg: shotsTable.xGoal,
      isHomeTeam: shotsTable.isHomeTeam,
    })
    .from(shotsTable)
    .where(eq(shotsTable.gameId, gameId))
    .orderBy(asc(shotsTable.gameTimeSeconds));
  return rows.map((r) => ({ team: r.isHomeTeam ? "home" : "away", t: r.t ?? 0, shooterId: r.shooterId ?? null, xg: r.xg ?? 0 }));
}

export async function getGameLive({ db, params }: ApiContext) {
  const gameId = params.gameId;
  const [landing, boxscore, playByPlay, rightRail, shifts, standings] = await Promise.all([
    getGameLanding(gameId),
    getBoxscore(gameId),
    getPlayByPlay(gameId),
    getRightRail(gameId),
    getShiftChart(gameId),
    getStandings(),
  ]);
  if (!playByPlay?.plays) throw new HttpError(404, { error: "Game not found", code: "GAME_NOT_FOUND" });
  const [away, home] = await Promise.all([
    playByPlay.awayTeam?.abbrev ? getClubStats(playByPlay.awayTeam.abbrev) : null,
    playByPlay.homeTeam?.abbrev ? getClubStats(playByPlay.homeTeam.abbrev) : null,
  ]);
  const isFinal = isFinalState(landing?.gameState ?? playByPlay.gameState);
  const referenceXg = isFinal ? await moneyPuckShots(db, gameId) : [];
  const body = buildLiveGame({ gameId, landing, boxscore, playByPlay, rightRail, shifts, standings, clubStats: { away, home }, referenceXg });
  // Finished games stop changing, so they can sit in the CDN much longer.
  return json(body, isFinalState(body.meta.gameState) ? CacheTier.semiStatic : CacheTier.live);
}
