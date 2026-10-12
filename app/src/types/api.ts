/** Standard API error response */
export interface ApiError {
  code: string;
  message: string;
  details?: string[];
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/** Common query parameters for paginated endpoints */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Common query parameters for filtering by situation */
export interface SituationParams {
  situation?: Situation;
}

/** Common query parameters for filtering by season */
export interface SeasonParams {
  season?: number;
}

/** Valid game situations */
export type Situation =
  | "all"
  | "5on5"
  | "5on4"
  | "4on5"
  | "5on3"
  | "3on5"
  | "4on4"
  | "3on3"
  | "other";

/** Valid line types */
export type LineType = "forward" | "defense";

/** Valid sort directions */
export type SortDirection = "asc" | "desc";

/** Valid sort fields for lines */
export type LineSortField =
  | "toi"
  | "icetime"
  | "gp"
  | "gamesplayed"
  | "gf"
  | "goalsfor"
  | "ga"
  | "goalsagainst"
  | "xgf"
  | "xgoalsfor"
  | "xgpct"
  | "xgoalspct"
  | "cf"
  | "corsifor"
  | "cfpct"
  | "corsipct";
