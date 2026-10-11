// Port of Benchwarmer.Api/Dtos/ApiError.cs: `{ error, code }` bodies.
export interface ApiErrorBody {
  error: string;
  code: string;
}

// A few C# endpoints returned other shapes (a bare string, `{ error }`).
export type ErrorBody = ApiErrorBody | { error: string } | string;

export class HttpError extends Error {
  readonly status: number;
  readonly body: ErrorBody;

  constructor(status: number, body: ErrorBody) {
    super(typeof body === "string" ? body : body.error);
    this.status = status;
    this.body = body;
  }
}

function error(message: string, code: string): ApiErrorBody {
  return { error: message, code };
}

export const ApiError = {
  playerNotFound: error("Player not found", "PLAYER_NOT_FOUND"),
  teamNotFound: error("Team not found", "TEAM_NOT_FOUND"),
  invalidPagination: error("Both page and pageSize must be provided for pagination", "INVALID_PAGINATION"),
  invalidPage: error("page must be >= 1", "INVALID_PAGE"),
  invalidPageSize: error("pageSize must be between 1 and 100", "INVALID_PAGE_SIZE"),
  missingQuery: error("Query parameter 'q' is required", "MISSING_QUERY"),
  insufficientPlayers: error("At least 2 player IDs required", "INSUFFICIENT_PLAYERS"),
  tooManyPlayers: error("Maximum 5 players for comparison", "TOO_MANY_PLAYERS"),
  invalidSortDir: error("Invalid sortDir. Valid values: asc, desc", "INVALID_SORT_DIR"),
  invalidSituation: (valid: readonly string[]) =>
    error(`Invalid situation. Valid values: ${valid.join(", ")}`, "INVALID_SITUATION"),
  invalidLineType: (valid: readonly string[]) =>
    error(`Invalid lineType. Valid values: ${valid.join(", ")}`, "INVALID_LINE_TYPE"),
  invalidSortField: (valid: readonly string[]) =>
    error(`Invalid sortBy. Valid values: ${valid.join(", ")}`, "INVALID_SORT_FIELD"),
  invalidShotType: (valid: readonly string[]) =>
    error(`Invalid shotType. Valid values: ${valid.join(", ")}`, "INVALID_SHOT_TYPE"),
  // ASP.NET rejected unparseable or missing required parameters before the
  // handler ran (400, empty body in production). Name the parameter instead.
  invalidParameter: (name: string) => error(`Invalid or missing query parameter '${name}'`, "INVALID_PARAMETER"),
};

export function notFound(body: ErrorBody): never {
  throw new HttpError(404, body);
}

export function badRequest(body: ErrorBody): never {
  throw new HttpError(400, body);
}
