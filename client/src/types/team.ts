/** Team data */
export interface Team {
  id: number;
  abbreviation: string;
  name: string;
  division?: string;
  conference?: string;
  isActive: boolean;
}

/** Response from GET /api/teams */
export interface TeamListResponse {
  teams: Team[];
}
