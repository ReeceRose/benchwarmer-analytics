/** Season data */
export interface Season {
  year: number;
  label: string;
}

/** Response from GET /api/seasons */
export interface SeasonListResponse {
  seasons: Season[];
}
