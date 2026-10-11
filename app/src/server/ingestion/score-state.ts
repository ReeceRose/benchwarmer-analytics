import { gameScoreStateTimes } from "@/server/db/schema";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";

const REGULATION_PERIOD = 20 * 60;
const REGULAR_SEASON_OT = 5 * 60;
const PLAYOFF_OT = 20 * 60;

export interface Goal {
  teamCode: string;
  period: number;
  // MoneyPuck `time`: seconds since the start of the game (cumulative).
  gameSeconds: number;
}

export interface GameInfo {
  homeTeam: string;
  awayTeam: string;
  isPlayoffs: boolean;
  finalPeriod: number;
}

export interface TeamStateSeconds {
  leading: number;
  trailing: number;
  tied: number;
}

export function periodLength(period: number, isPlayoffs: boolean): number {
  if (period <= 3) return REGULATION_PERIOD;
  return isPlayoffs ? PLAYOFF_OT : REGULAR_SEASON_OT;
}

function periodStart(period: number, isPlayoffs: boolean): number {
  if (period <= 3) return (period - 1) * REGULATION_PERIOD;
  return 3 * REGULATION_PERIOD + (period - 4) * periodLength(4, isPlayoffs);
}

// Final period played: regulation (3), or the last OT period. A shootout
// means one OT period was played first.
export function finalPeriod(maxShotPeriod: number, wentToOT: boolean, wentToShootout: boolean, nhlPeriodType: string | null): number {
  let period = maxShotPeriod > 3 ? maxShotPeriod : 3;
  if (wentToOT || wentToShootout || nhlPeriodType === "OT" || nhlPeriodType === "SO") period = Math.max(period, 4);
  return period;
}

// Seconds each team spent leading/trailing/tied. Port of
// ScoreStateTimeCalculator.CalculateGameScoreStateTimes, fixed to convert
// MoneyPuck's cumulative game time into time within the period (the C# code
// treated it as period-relative, inflating every period after the first).
// An OT goal ends the game; regulation periods always run to 20:00.
export function computeScoreState(goals: Goal[], game: GameInfo): { home: TeamStateSeconds; away: TeamStateSeconds } {
  const home = { leading: 0, trailing: 0, tied: 0 };
  const away = { leading: 0, trailing: 0, tied: 0 };
  let homeScore = 0;
  let awayScore = 0;

  const add = (seconds: number) => {
    if (seconds <= 0) return;
    if (homeScore > awayScore) {
      home.leading += seconds;
      away.trailing += seconds;
    } else if (awayScore > homeScore) {
      home.trailing += seconds;
      away.leading += seconds;
    } else {
      home.tied += seconds;
      away.tied += seconds;
    }
  };

  const sorted = [...goals].sort((a, b) => a.period - b.period || a.gameSeconds - b.gameSeconds);
  let period = 1;
  let last = 0;
  for (const goal of sorted) {
    while (period < goal.period) {
      add(periodLength(period, game.isPlayoffs) - last);
      period++;
      last = 0;
    }
    const length = periodLength(goal.period, game.isPlayoffs);
    const elapsed = Math.min(Math.max(goal.gameSeconds - periodStart(goal.period, game.isPlayoffs), 0), length);
    add(elapsed - last);
    if (goal.teamCode === game.homeTeam) homeScore++;
    else awayScore++;
    last = Math.max(last, elapsed);
  }

  while (period <= game.finalPeriod) {
    const suddenDeathEnded = period === game.finalPeriod && period > 3 && last > 0;
    if (!suddenDeathEnded) add(periodLength(period, game.isPlayoffs) - last);
    period++;
    last = 0;
  }
  return { home, away };
}

// Recomputes score-state seconds for a season's games that have shots
// (optionally only `gameIds`). Unchanged rows aren't rewritten.
export async function calculateScoreStates(db: Queryable, season: number, gameIds?: string[]): Promise<number> {
  const scope = gameIds ? `AND game_id = ANY($2::text[])` : "";
  const params: unknown[] = gameIds ? [season, gameIds] : [season];

  const { rows: info } = await db.query<{
    game_id: string;
    home_team_code: string;
    away_team_code: string;
    is_playoffs: boolean;
    max_period: number;
    went_to_ot: boolean;
    went_to_shootout: boolean;
    period_type: string | null;
  }>(
    `SELECT s.game_id, min(s.home_team_code) AS home_team_code, min(s.away_team_code) AS away_team_code,
            bool_or(s.is_playoff_game) AS is_playoffs, max(s.period) AS max_period,
            coalesce(bool_or(s.went_to_o_t), false) AS went_to_ot,
            coalesce(bool_or(s.went_to_shootout), false) AS went_to_shootout,
            min(g.period_type) AS period_type
     FROM shots s LEFT JOIN games g ON g.game_id = s.game_id
     WHERE s.season = $1 ${scope.replace("game_id", "s.game_id")}
     GROUP BY s.game_id`,
    params,
  );
  const { rows: goalRows } = await db.query<{ game_id: string; team_code: string; period: number; game_time_seconds: number }>(
    `SELECT game_id, team_code, period, game_time_seconds FROM shots WHERE season = $1 AND is_goal ${scope}`,
    params,
  );

  const goalsByGame = new Map<string, Goal[]>();
  for (const g of goalRows) {
    const list = goalsByGame.get(g.game_id) ?? [];
    list.push({ teamCode: g.team_code, period: g.period, gameSeconds: g.game_time_seconds });
    goalsByGame.set(g.game_id, list);
  }

  const rows: UpsertRow<typeof gameScoreStateTimes>[] = [];
  for (const game of info) {
    const gameInfo: GameInfo = {
      homeTeam: game.home_team_code,
      awayTeam: game.away_team_code,
      isPlayoffs: game.is_playoffs,
      finalPeriod: finalPeriod(game.max_period, game.went_to_ot, game.went_to_shootout, game.period_type),
    };
    const { home, away } = computeScoreState(goalsByGame.get(game.game_id) ?? [], gameInfo);
    for (const [team, s] of [
      [gameInfo.homeTeam, home],
      [gameInfo.awayTeam, away],
    ] as const) {
      rows.push({
        gameId: game.game_id,
        teamAbbreviation: team,
        season,
        isPlayoffs: gameInfo.isPlayoffs,
        leadingSeconds: s.leading,
        trailingSeconds: s.trailing,
        tiedSeconds: s.tied,
      });
    }
  }
  return upsert(db, gameScoreStateTimes, rows, { conflict: ["gameId", "teamAbbreviation"], touch: "calculated_at" });
}
