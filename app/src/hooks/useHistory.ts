import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { MilestoneKind, TrackingLeaderPosition } from "@/types";
import {
  getDraft,
  getGoalieRest,
  getPlayerShotTypes,
  getPlayoffBracket,
  getStandingsRace,
  getTeamShotTypes,
  getTeamSituations,
  getTeamHomeAway,
  getTeamHomeAwayHistory,
  getLeagueHomeAwayHistory,
  getTrackingLeaders,
  getTravel,
  getTrophies,
  getTrophy,
  getMilestoneClub,
  getOfficials,
  getAttendance,
  getStreaks,
  getFranchiseHistory,
  getGoalReplay,
  getMilestones,
  getPlayerTracking,
  getTeamTracking,
} from "@/lib/api";

/** A player's NHL EDGE tracking numbers (latest season with data). */
export function usePlayerTracking(id: number) {
  return useQuery({
    queryKey: ["players", id, "tracking"],
    queryFn: () => getPlayerTracking(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });
}

/** A team's NHL EDGE tracking numbers, with league ranks. */
export function useTeamTracking(abbrev: string) {
  return useQuery({
    queryKey: ["teams", abbrev, "tracking"],
    queryFn: () => getTeamTracking(abbrev),
    staleTime: 1000 * 60 * 30,
  });
}

export const milestonesQueryOptions = queryOptions({
  queryKey: ["milestones"],
  queryFn: getMilestones,
  staleTime: 1000 * 60 * 30,
});

/** Active players closest to a career milestone. */
export function useMilestones() {
  return useQuery(milestonesQueryOptions);
}

/** One draft class (default: the latest), optionally one team's picks. */
export function useDraft(year?: number, team?: string) {
  return useQuery({
    queryKey: ["draft", { year, team }],
    queryFn: () => getDraft(year, team),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });
}

/** A team's franchise history: every season, playoff runs, recent first-round picks. */
export function useFranchiseHistory(abbrev: string) {
  return useQuery({
    queryKey: ["teams", abbrev, "history"],
    queryFn: () => getFranchiseHistory(abbrev),
    staleTime: 1000 * 60 * 30,
  });
}

/** Player and puck positions for a goal's build-up. Fetched only when asked for. */
export function useGoalReplay(gameId: string, eventId: number | null) {
  return useQuery({
    queryKey: ["games", gameId, "replay", eventId],
    queryFn: () => getGoalReplay(gameId, eventId!),
    enabled: eventId != null,
    staleTime: Infinity,
    retry: false,
  });
}

const HALF_HOUR = 1000 * 60 * 30;

/** League-wide NHL EDGE top 10s (top speed, hardest shot, distance…). */
export function useTrackingLeaders(season?: number, position?: TrackingLeaderPosition) {
  return useQuery({
    queryKey: ["tracking", "leaders", { season, position }],
    queryFn: () => getTrackingLeaders(season, position),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
}

/** Shots, goals and shooting % by shot type for a player (or a team, with `team`). */
export function useShotTypes(target: { playerId: number } | { team: string }) {
  const key = "team" in target ? ["teams", target.team, "shot-types"] : ["players", target.playerId, "shot-types"];
  return useQuery({
    queryKey: key,
    queryFn: () => ("team" in target ? getTeamShotTypes(target.team) : getPlayerShotTypes(target.playerId)),
    staleTime: HALF_HOUR,
  });
}

/** A team's records by game situation and by days of rest. */
export function useTeamSituations(abbrev: string, season?: number) {
  return useQuery({
    queryKey: ["teams", abbrev, "situations", { season }],
    queryFn: () => getTeamSituations(abbrev, season),
    staleTime: HALF_HOUR,
  });
}

/** A team's home and away splits, with the league's for context. */
export function useTeamHomeAway(abbrev: string, season?: number, playoffs?: boolean) {
  return useQuery({
    queryKey: ["teams", abbrev, "home-away", { season, playoffs }],
    queryFn: () => getTeamHomeAway(abbrev, season, playoffs),
    staleTime: HALF_HOUR,
  });
}

/** A team's home and away rates for every season. */
export function useTeamHomeAwayHistory(abbrev: string, playoffs?: boolean) {
  return useQuery({
    queryKey: ["teams", abbrev, "home-away-history", { playoffs }],
    queryFn: () => getTeamHomeAwayHistory(abbrev, playoffs),
    staleTime: HALF_HOUR,
  });
}

/** Every team's home and road rates, by season. */
export function useLeagueHomeAwayHistory(playoffs?: boolean) {
  return useQuery({
    queryKey: ["stats", "home-away", { playoffs }],
    queryFn: () => getLeagueHomeAwayHistory(playoffs),
    staleTime: HALF_HOUR,
  });
}

/** A goalie's save % by days of rest. */
export function useGoalieRest(id: number) {
  return useQuery({ queryKey: ["players", id, "rest"], queryFn: () => getGoalieRest(id), staleTime: HALF_HOUR });
}

/** Every team's points by date this season. */
export function useStandingsRace(season?: number) {
  return useQuery({ queryKey: ["standings", "race", { season }], queryFn: () => getStandingsRace(season), staleTime: HALF_HOUR });
}

/** Every team's travel miles and back-to-backs. */
export function useTravel(season?: number) {
  return useQuery({ queryKey: ["standings", "travel", { season }], queryFn: () => getTravel(season), staleTime: HALF_HOUR });
}

/** A season's playoff bracket (default: the latest). */
export function usePlayoffBracket(season?: number) {
  return useQuery({
    queryKey: ["playoffs", "bracket", { season }],
    queryFn: () => getPlayoffBracket(season),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
}

/** Every NHL trophy with its latest winners. */
export function useTrophies() {
  return useQuery({ queryKey: ["trophies"], queryFn: getTrophies, staleTime: HALF_HOUR });
}

/** One trophy's winners and finalists every season, and this season's race. */
export function useTrophy(slug: string) {
  return useQuery({ queryKey: ["trophies", slug], queryFn: () => getTrophy(slug), staleTime: HALF_HOUR });
}

/** Everyone in one milestone club, newest first. */
export function useMilestoneClub(kind: MilestoneKind) {
  return useQuery({
    queryKey: ["records", "milestones", kind],
    queryFn: () => getMilestoneClub(kind),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
}

/** Active NHL referees and linespeople. */
export function useOfficials() {
  return useQuery({ queryKey: ["records", "officials"], queryFn: getOfficials, staleTime: HALF_HOUR });
}

/** League attendance by season. */
export function useAttendance() {
  return useQuery({ queryKey: ["records", "attendance"], queryFn: getAttendance, staleTime: HALF_HOUR });
}

/** Current point and Game Score streaks (league, or one player's). */
export function useStreaks(playerId?: number) {
  return useQuery({ queryKey: ["stats", "streaks", { playerId }], queryFn: () => getStreaks(playerId), staleTime: HALF_HOUR });
}
