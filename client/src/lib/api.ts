import axios from "axios";
import type {
  TeamListResponse,
  Team,
  RosterResponse,
  LineListResponse,
  LineQueryParams,
  ChemistryMatrixResponse,
  ChemistryMatrixQueryParams,
  PlayerSearchResponse,
  PlayerDetail,
  PlayerStatsResponse,
  GoalieStatsResponse,
  LinemateHistoryResponse,
  PlayerComparisonResponse,
  PlayerRollingStatsResponse,
  GoalieWorkloadResponse,
  SeasonListResponse,
  OutliersResponse,
  TopLinesResponse,
  TeamShotsResponse,
  ShotQueryParams,
  ShooterStats,
  PlayerShotsResponse,
  GamesResponse,
  GameSummary,
  GameBoxscoreResponse,
  GamePreview,
  GoalieRecentFormResponse,
  BreakoutCandidatesResponse,
  AgeCurvesResponse,
  AgeDistributionResponse,
  SeasonPercentilesResponse,
  PowerRankingsResponse,
  OfficialStandingsResponse,
  StandingsAnalyticsResponse,
  SpecialTeamsOverview,
  SpecialTeamsPlayersResponse,
  SpecialTeamsSituation,
  LeaderboardCategory,
  LeaderboardResponse,
} from "@/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Teams

export async function getTeams(): Promise<TeamListResponse> {
  const { data } = await api.get<TeamListResponse>("/teams");
  return data;
}

export async function getTeam(abbrev: string): Promise<Team> {
  const { data } = await api.get<Team>(`/teams/${abbrev}`);
  return data;
}

export async function getTeamRoster(
  abbrev: string,
  season?: number,
  playoffs?: boolean
): Promise<RosterResponse> {
  const params: Record<string, unknown> = {};
  if (season !== undefined) params.season = season;
  if (playoffs !== undefined) params.playoffs = playoffs;

  const { data } = await api.get<RosterResponse>(`/teams/${abbrev}/roster`, {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return data;
}

export async function getTeamLines(
  abbrev: string,
  params: LineQueryParams
): Promise<LineListResponse> {
  const { data } = await api.get<LineListResponse>(`/teams/${abbrev}/lines`, {
    params,
  });
  return data;
}

export async function getChemistryMatrix(
  abbrev: string,
  params: ChemistryMatrixQueryParams
): Promise<ChemistryMatrixResponse> {
  const { data } = await api.get<ChemistryMatrixResponse>(
    `/teams/${abbrev}/chemistry-matrix`,
    { params }
  );
  return data;
}

// Players

export async function searchPlayers(
  query: string,
  page?: number,
  pageSize?: number
): Promise<PlayerSearchResponse> {
  const { data } = await api.get<PlayerSearchResponse>("/players", {
    params: { q: query, page, pageSize },
  });
  return data;
}

export async function getPlayer(id: number): Promise<PlayerDetail> {
  const { data } = await api.get<PlayerDetail>(`/players/${id}`);
  return data;
}

export async function getPlayerStats(
  id: number,
  season?: number,
  situation?: string
): Promise<PlayerStatsResponse | GoalieStatsResponse> {
  const { data } = await api.get<PlayerStatsResponse | GoalieStatsResponse>(`/players/${id}/stats`, {
    params: { season, situation },
  });
  return data;
}

export async function getPlayerLinemates(
  id: number,
  season?: number,
  situation?: string
): Promise<LinemateHistoryResponse> {
  const { data } = await api.get<LinemateHistoryResponse>(
    `/players/${id}/linemates`,
    { params: { season, situation } }
  );
  return data;
}

export async function comparePlayers(
  ids: number[],
  season?: number,
  situation?: string
): Promise<PlayerComparisonResponse> {
  const { data } = await api.get<PlayerComparisonResponse>("/players/compare", {
    params: { ids: ids.join(","), season, situation },
  });
  return data;
}

// Seasons

export async function getSeasons(): Promise<SeasonListResponse> {
  const { data } = await api.get<SeasonListResponse>("/seasons");
  return data;
}

export async function getTeamSeasons(abbrev: string): Promise<SeasonListResponse> {
  const { data } = await api.get<SeasonListResponse>(`/teams/${abbrev}/seasons`);
  return data;
}

// Stats

export async function getLeaderboard(
  category: LeaderboardCategory,
  season?: number,
  situation?: string,
  limit?: number,
  sortDir?: "asc" | "desc"
): Promise<LeaderboardResponse> {
  const { data } = await api.get<LeaderboardResponse>("/stats/leaderboards", {
    params: { category, season, situation, limit, sortDir },
  });
  return data;
}

export async function getOutliers(
  season?: number,
  situation?: string,
  skaterLimit?: number,
  goalieLimit?: number
): Promise<OutliersResponse> {
  const { data } = await api.get<OutliersResponse>("/stats/outliers", {
    params: { season, situation, skaterLimit, goalieLimit },
  });
  return data;
}

export async function getTopLines(
  season?: number,
  situation?: string,
  limit?: number
): Promise<TopLinesResponse> {
  const { data } = await api.get<TopLinesResponse>("/stats/top-lines", {
    params: { season, situation, limit },
  });
  return data;
}

// Shots

export async function getTeamShots(
  abbrev: string,
  params: ShotQueryParams
): Promise<TeamShotsResponse> {
  const { data } = await api.get<TeamShotsResponse>(`/teams/${abbrev}/shots`, {
    params,
  });
  return data;
}

export async function getShooterStats(
  abbrev: string,
  season: number,
  playoffs?: boolean
): Promise<ShooterStats[]> {
  const { data } = await api.get<ShooterStats[]>(
    `/teams/${abbrev}/shots/shooters`,
    { params: { season, playoffs } }
  );
  return data;
}

export async function getTeamShotsAgainst(
  abbrev: string,
  params: ShotQueryParams
): Promise<TeamShotsResponse> {
  const { data } = await api.get<TeamShotsResponse>(`/teams/${abbrev}/shots/against`, {
    params,
  });
  return data;
}

export interface PlayerShotParams {
  season?: number;
  limit?: number;
  period?: number;
  shotType?: string;
  goalsOnly?: boolean;
}

export async function getPlayerShots(
  playerId: number,
  params: PlayerShotParams = {}
): Promise<PlayerShotsResponse> {
  const { data } = await api.get<PlayerShotsResponse>(`/players/${playerId}/shots`, {
    params,
  });
  return data;
}

// Games

export async function getYesterdaysGames(): Promise<GamesResponse> {
  const { data } = await api.get<GamesResponse>("/games/yesterday");
  return data;
}

export async function getTodaysGames(): Promise<GamesResponse> {
  const { data } = await api.get<GamesResponse>("/games/today");
  return data;
}

export async function getGamesByDate(date: string): Promise<GamesResponse> {
  const { data } = await api.get<GamesResponse>("/games", {
    params: { date },
  });
  return data;
}

export async function getGame(gameId: string): Promise<GameSummary> {
  const { data } = await api.get<GameSummary>(`/games/${gameId}`);
  return data;
}

export async function getGameBoxscore(gameId: string): Promise<GameBoxscoreResponse> {
  const { data } = await api.get<GameBoxscoreResponse>(`/games/${gameId}/boxscore`);
  return data;
}

export async function getLiveScores(): Promise<GamesResponse> {
  const { data } = await api.get<GamesResponse>("/games/live");
  return data;
}

export async function getGamePreview(gameId: string): Promise<GamePreview> {
  const { data } = await api.get<GamePreview>(`/games/${gameId}/preview`);
  return data;
}

export async function getGoalieRecentForm(gameId: string): Promise<GoalieRecentFormResponse> {
  const { data } = await api.get<GoalieRecentFormResponse>(`/games/${gameId}/goalie-form`);
  return data;
}

// Rolling Stats

export async function getPlayerRollingStats(
  playerId: number,
  season?: number,
  games?: number
): Promise<PlayerRollingStatsResponse> {
  const { data } = await api.get<PlayerRollingStatsResponse>(
    `/players/${playerId}/rolling-stats`,
    { params: { season, games } }
  );
  return data;
}

export async function getGoalieWorkload(
  playerId: number,
  season?: number,
  games?: number
): Promise<GoalieWorkloadResponse> {
  const { data } = await api.get<GoalieWorkloadResponse>(
    `/players/${playerId}/workload`,
    { params: { season, games } }
  );
  return data;
}

// Analytics

export async function getBreakoutCandidates(
  season?: number,
  minGames?: number,
  limit?: number
): Promise<BreakoutCandidatesResponse> {
  const { data } = await api.get<BreakoutCandidatesResponse>(
    "/stats/breakout-candidates",
    { params: { season, minGames, limit } }
  );
  return data;
}

export async function getAgeCurves(
  minGames?: number,
  playerIds?: number[],
  useMedian?: boolean
): Promise<AgeCurvesResponse> {
  const { data } = await api.get<AgeCurvesResponse>("/stats/age-curves", {
    params: {
      minGames,
      playerIds: playerIds?.length ? playerIds.join(",") : undefined,
      useMedian: useMedian || undefined,
    },
  });
  return data;
}

export async function getAgeDistribution(
  age: number,
  minGames?: number
): Promise<AgeDistributionResponse> {
  const { data } = await api.get<AgeDistributionResponse>(`/stats/age-distribution/${age}`, {
    params: { minGames },
  });
  return data;
}

export async function getSeasonPercentiles(
  season: number,
  minGames?: number
): Promise<SeasonPercentilesResponse> {
  const { data } = await api.get<SeasonPercentilesResponse>(
    `/stats/season-percentiles/${season}`,
    { params: { minGames } }
  );
  return data;
}

// Standings

export async function getPowerRankings(
  season?: number
): Promise<PowerRankingsResponse> {
  const { data } = await api.get<PowerRankingsResponse>(
    "/standings/power-rankings",
    { params: { season } }
  );
  return data;
}

export async function getOfficialStandings(
  season?: number
): Promise<OfficialStandingsResponse> {
  const { data } = await api.get<OfficialStandingsResponse>("/standings", {
    params: { season },
  });
  return data;
}

export async function getStandingsAnalytics(
  season?: number
): Promise<StandingsAnalyticsResponse> {
  const { data } = await api.get<StandingsAnalyticsResponse>(
    "/standings/analytics",
    { params: { season } }
  );
  return data;
}

// Special Teams

export async function getTeamSpecialTeams(
  abbrev: string,
  season?: number,
  playoffs?: boolean
): Promise<SpecialTeamsOverview> {
  const params: Record<string, unknown> = {};
  if (season !== undefined) params.season = season;
  if (playoffs !== undefined) params.playoffs = playoffs;

  const { data } = await api.get<SpecialTeamsOverview>(
    `/teams/${abbrev}/special-teams`,
    { params: Object.keys(params).length > 0 ? params : undefined }
  );
  return data;
}

export async function getSpecialTeamsPlayers(
  abbrev: string,
  situation: SpecialTeamsSituation,
  season?: number,
  playoffs?: boolean
): Promise<SpecialTeamsPlayersResponse> {
  const params: Record<string, unknown> = { situation };
  if (season !== undefined) params.season = season;
  if (playoffs !== undefined) params.playoffs = playoffs;

  const { data } = await api.get<SpecialTeamsPlayersResponse>(
    `/teams/${abbrev}/special-teams/players`,
    { params }
  );
  return data;
}
