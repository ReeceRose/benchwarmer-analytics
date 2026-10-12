import type { LineType, Situation, LineSortField, SortDirection } from "@/types/api";

/** Summary player info used in line combinations */
export interface PlayerSummary {
  id: number;
  name: string;
  position?: string;
}

/** Line combination data */
export interface LineCombination {
  id: number;
  season: number;
  team: string;
  situation: string;
  player1: PlayerSummary;
  player2: PlayerSummary;
  player3?: PlayerSummary;
  iceTimeSeconds: number;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  expectedGoalsPct?: number;
  corsiPct?: number;
}

/** Response from GET /api/teams/:abbrev/lines */
export interface LineListResponse {
  lines: LineCombination[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/** Query parameters for lines endpoint */
export interface LineQueryParams {
  season: number;
  situation?: Situation;
  lineType?: LineType;
  minToi?: number;
  sortBy?: LineSortField;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
}

/** Player pair chemistry data */
export interface ChemistryPair {
  player1Id: number;
  player1Name: string;
  player1Position?: string;
  player2Id: number;
  player2Name: string;
  player2Position?: string;
  totalIceTimeSeconds: number;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  expectedGoalsPct?: number;
  corsiPct?: number;
}

/** Response from GET /api/teams/:abbrev/chemistry-matrix */
export interface ChemistryMatrixResponse {
  team: string;
  season: number;
  situation?: string;
  pairs: ChemistryPair[];
}

/** Position filter for chemistry matrix */
export type PositionFilter = "all" | "forward" | "defense";

/** Query parameters for chemistry matrix endpoint */
export interface ChemistryMatrixQueryParams {
  season: number;
  situation?: Situation;
  position?: PositionFilter;
}
