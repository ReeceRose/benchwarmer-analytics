// Backtests the season simulation to choose STRENGTH_SD: replays 2015-2024
// from ~8 and ~41 games played and checks how often each team's simulated
// 10th-90th percentile points range contains its actual final points (the
// target is 80%). Read-only.
//
//   npx tsx scripts/calibrate-season-sims.ts
import { config } from "dotenv";
import pg from "pg";
import { OVERTIME_RATE, PREGAME_COEFFICIENTS, RATING_PARAMS } from "@/server/projections/pregame-model";
import { blendRating, type Rating } from "@/server/projections/ratings";
import { simulateSeason, type SimTeam } from "@/server/projections/simulate";

config({ path: [".env.local", "../.env.local"], quiet: true });

// 2019-20 and 2020-21 had shortened or paused seasons.
const SEASONS = [2015, 2016, 2017, 2018, 2021, 2022, 2023, 2024];

interface GameRow {
  season: number;
  game_id: string;
  game_date: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  ot: boolean;
  h_xgd: number | null;
  h_gd: number | null;
  a_xgd: number | null;
  a_gd: number | null;
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const { rows } = await client.query<GameRow>(`
  select g.season, g.game_id, g.game_date::text, g.home_team_code as home, g.away_team_code as away,
    g.home_score as hs, g.away_score as "as", coalesce(g.period_type, 'REG') <> 'REG' as ot,
    (h5.score_venue_adjusted_x_goals_for - h5.score_venue_adjusted_x_goals_against)::float8 as h_xgd,
    (ha.goals_for - ha.goals_against)::float8 as h_gd,
    (a5.score_venue_adjusted_x_goals_for - a5.score_venue_adjusted_x_goals_against)::float8 as a_xgd,
    (aa.goals_for - aa.goals_against)::float8 as a_gd
  from games g
  left join team_games h5 on h5.game_id = g.game_id and h5.team_abbreviation = g.home_team_code and h5.situation = '5on5'
  left join team_games ha on ha.game_id = g.game_id and ha.team_abbreviation = g.home_team_code and ha.situation = 'all'
  left join team_games a5 on a5.game_id = g.game_id and a5.team_abbreviation = g.away_team_code and a5.situation = '5on5'
  left join team_games aa on aa.game_id = g.game_id and aa.team_abbreviation = g.away_team_code and aa.situation = 'all'
  where g.game_type = 2 and g.game_state in ('OFF', 'FINAL') and g.season between ${SEASONS[0] - 1} and ${SEASONS.at(-1)}
  order by g.game_date, g.game_id`);
await client.end();

const bySeason = new Map<number, GameRow[]>();
for (const r of rows) {
  const list = bySeason.get(r.season) ?? [];
  list.push(r);
  bySeason.set(r.season, list);
}

function sums(games: GameRow[]) {
  const s = new Map<string, { xgd: number; gd: number; n: number; points: number; rw: number }>();
  const get = (t: string) => s.get(t) ?? (s.set(t, { xgd: 0, gd: 0, n: 0, points: 0, rw: 0 }), s.get(t)!);
  for (const g of games) {
    const h = get(g.home);
    const a = get(g.away);
    h.n++; a.n++;
    h.xgd += g.h_xgd ?? 0; h.gd += g.h_gd ?? 0;
    a.xgd += g.a_xgd ?? 0; a.gd += g.a_gd ?? 0;
    const [win, lose] = g.hs > g.as ? [h, a] : [a, h];
    win.points += 2;
    if (g.ot) lose.points += 1;
    else win.rw += 1;
  }
  return s;
}

function backtest(strengthSd: number, cutGames: number) {
  let inside = 0;
  let total = 0;
  let absError = 0;
  for (const season of SEASONS) {
    const games = bySeason.get(season)!;
    const priorSums = sums(bySeason.get(season - 1) ?? []);
    const prior = new Map<string, Rating>([...priorSums].map(([t, s]) => [t, { xgd: s.xgd / s.n, gd: s.gd / s.n, gamesPlayed: s.n }]));
    // Cut when the average team has played `cutGames`.
    const teamsCount = new Set(games.map((g) => g.home)).size;
    const cut = Math.round((cutGames * teamsCount) / 2);
    const before = games.slice(0, cut);
    const after = games.slice(cut);
    const now = sums(before);
    const final = sums(games);
    const names = [...final.keys()].sort();
    const teams: SimTeam[] = names.map((abbrev, i) => {
      const s = now.get(abbrev) ?? { xgd: 0, gd: 0, n: 0, points: 0, rw: 0 };
      return {
        abbrev,
        // Dummy alignment: playoffs aren't scored here.
        conference: i % 2 ? "E" : "W",
        division: `${i % 2 ? "E" : "W"}${i % 4 < 2 ? "A" : "B"}`,
        points: s.points,
        gamesPlayed: s.n,
        regulationWins: s.rw,
        rating: blendRating(s, prior.get(abbrev), RATING_PARAMS),
      };
    });
    const { odds } = simulateSeason(
      teams,
      after.map((g) => ({ gameId: g.game_id, home: g.home, away: g.away })),
      { sims: 2000, seed: season, coefficients: PREGAME_COEFFICIENTS, overtimeRate: OVERTIME_RATE, strengthSd, priorGames: RATING_PARAMS.priorGames },
    );
    for (const o of odds) {
      const actual = final.get(o.abbrev)!.points;
      total++;
      if (actual >= o.pointsP10 && actual <= o.pointsP90) inside++;
      absError += Math.abs(actual - o.pointsAvg);
    }
  }
  return { coverage: inside / total, mae: absError / total, teams: total };
}

for (const cutGames of [8, 41]) {
  console.log(`\nFrom ~${cutGames} games played:`);
  for (const sd of [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4]) {
    const r = backtest(sd, cutGames);
    console.log(`  SD ${sd.toFixed(2)}: 10-90% range holds the final ${(r.coverage * 100).toFixed(1)}% of the time (target 80%), mean error ${r.mae.toFixed(1)} pts, ${r.teams} team-seasons`);
  }
}
