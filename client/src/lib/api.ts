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
  LinemateHistoryResponse,
  PlayerComparisonResponse,
  SeasonListResponse,
  HomepageDataResponse,
  TeamShotsResponse,
  ShotQueryParams,
  ShooterStats,
  PlayerShotsResponse,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
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
): Promise<PlayerStatsResponse> {
  const { data } = await api.get<PlayerStatsResponse>(`/players/${id}/stats`, {
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

export async function getHomepageData(
  season?: number,
  situation?: string
): Promise<HomepageDataResponse> {
  const { data } = await api.get<HomepageDataResponse>("/stats/homepage", {
    params: { season, situation },
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
