// Benchmarks the pregame model against sportsbook lines (game_odds).
//
//   npx tsx scripts/evaluate-pregame-vs-market.ts
//
// Rates every regular-season game from what was known at puck drop (same
// walk-forward as fit-pregame-model.ts, with the production coefficients),
// then compares log loss and calibration with the market's opening and
// closing lines (margin removed) on the games that have both. Finally fits
// a blend (home ice + our logit + the market's) leaving one season out at a
// time, to see whether mixing the two beats either alone. Read-only.
import { config } from "dotenv";
import pg from "pg";
import { evaluate, fit } from "@/server/projections/logistic-fit";
import { PREGAME_COEFFICIENTS, RATING_PARAMS } from "@/server/projections/pregame-model";
import { RatingTable, logit, pregameHomeWinProbability, type Rating } from "@/server/projections/ratings";
import { PROVIDERS } from "@/server/ingestion/espn/odds";

config({ path: [".env.local", "../.env.local"], quiet: true });

const FIRST_ODDS_SEASON = 2022;

interface Row {
  season: number;
  game_id: string;
  home: string;
  away: string;
  home_won: boolean;
  h_xgf: number; h_xga: number; h_gf: number; h_ga: number;
  a_xgf: number; a_xga: number; a_gf: number; a_ga: number;
  open: number | null;
  close: number | null;
}

// Best book per game: the PROVIDERS order (ESPN BET, DraftKings, Caesars, MGM).
const providerRank = Object.keys(PROVIDERS)
  .map((id, i) => `when '${id}' then ${i}`)
  .join(" ");

const SQL = `
with best as (
  select distinct on (game_id) game_id, home_probability_open::float8 as open, home_probability_close::float8 as close
  from game_odds
  where home_probability_close is not null
  order by game_id, case provider_id ${providerRank} else 99 end
)
select g.season, g.game_id, g.home_team_code as home, g.away_team_code as away,
  g.home_score > g.away_score as home_won,
  h5.score_venue_adjusted_x_goals_for::float8 as h_xgf, h5.score_venue_adjusted_x_goals_against::float8 as h_xga,
  ha.goals_for::float8 as h_gf, ha.goals_against::float8 as h_ga,
  a5.score_venue_adjusted_x_goals_for::float8 as a_xgf, a5.score_venue_adjusted_x_goals_against::float8 as a_xga,
  aa.goals_for::float8 as a_gf, aa.goals_against::float8 as a_ga,
  b.open, b.close
from games g
join team_games h5 on h5.game_id = g.game_id and h5.team_abbreviation = g.home_team_code and h5.situation = '5on5'
join team_games ha on ha.game_id = g.game_id and ha.team_abbreviation = g.home_team_code and ha.situation = 'all'
join team_games a5 on a5.game_id = g.game_id and a5.team_abbreviation = g.away_team_code and a5.situation = '5on5'
join team_games aa on aa.game_id = g.game_id and aa.team_abbreviation = g.away_team_code and aa.situation = 'all'
left join best b on b.game_id = g.game_id
where g.game_type = 2 and g.game_state in ('OFF', 'FINAL') and g.season >= ${FIRST_ODDS_SEASON - 1}
order by g.game_date, g.game_id`;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const { rows } = await client.query<Row>(SQL);
await client.end();

// Our pregame probability for every game, from ratings as they stood before it.
interface Sample {
  season: number;
  won: boolean;
  model: number;
  open: number | null;
  close: number;
}
const samples: Sample[] = [];
let prior = new Map<string, Rating>();
for (const season of [...new Set(rows.map((r) => r.season))].sort()) {
  const table = new RatingTable();
  for (const g of rows.filter((r) => r.season === season)) {
    const home = table.rating(g.home, prior.get(g.home), RATING_PARAMS);
    const away = table.rating(g.away, prior.get(g.away), RATING_PARAMS);
    if (season >= FIRST_ODDS_SEASON && g.close !== null) {
      samples.push({ season, won: g.home_won, model: pregameHomeWinProbability(home, away, PREGAME_COEFFICIENTS), open: g.open, close: g.close });
    }
    table.add({ team: g.home, xgf: g.h_xgf, xga: g.h_xga, gf: g.h_gf, ga: g.h_ga });
    table.add({ team: g.away, xgf: g.a_xgf, xga: g.a_xga, gf: g.a_gf, ga: g.a_ga });
  }
  prior = table.averages();
}

const logLoss = (ps: { p: number; won: boolean }[]) =>
  ps.reduce((s, { p, won }) => s - Math.log(won ? p : 1 - p), 0) / ps.length;
const seasons = [...new Set(samples.map((s) => s.season))];
const withOpen = samples.filter((s) => s.open !== null);

console.log(`${samples.length} games with a closing line (${withOpen.length} with an opener), seasons ${seasons.join(", ")}\n`);
console.log("Log loss (lower is better)       all     " + seasons.join("    "));
const line = (label: string, p: (s: Sample) => number, set = samples) => {
  const cells = [set, ...seasons.map((y) => set.filter((s) => s.season === y))].map((xs) =>
    xs.length ? logLoss(xs.map((s) => ({ p: p(s), won: s.won }))).toFixed(4) : "  –   ",
  );
  console.log(`${label.padEnd(32)} ${cells.join("  ")}`);
};
const homeRate = samples.filter((s) => s.won).length / samples.length;
line("Home ice only", () => homeRate);
line("Our model", (s) => s.model);
line("Our model (games with an opener)", (s) => s.model, withOpen);
line("Market, opening line", (s) => s.open!, withOpen);
line("Market, closing line", (s) => s.close);

// Leave-one-season-out blend: logistic on [1, logit(ours), logit(market)].
const x = (s: Sample) => [1, logit(s.model), logit(s.close)];
const blended: { p: number; won: boolean }[] = [];
for (const held of seasons) {
  const beta = fit(samples.filter((s) => s.season !== held).map((s) => ({ x: x(s), n: 1, wins: s.won ? 1 : 0 })));
  for (const s of samples.filter((t) => t.season === held)) {
    blended.push({ p: 1 / (1 + Math.exp(-x(s).reduce((t, v, i) => t + v * beta[i], 0))), won: s.won });
  }
}
console.log(`${"Blend (out of sample)".padEnd(32)} ${logLoss(blended).toFixed(4)}`);
const beta = fit(samples.map((s) => ({ x: x(s), n: 1, wins: s.won ? 1 : 0 })));
console.log(`\nBlend weights on all seasons: intercept ${beta[0].toFixed(3)}, ours ${beta[1].toFixed(3)}, market ${beta[2].toFixed(3)}`);

evaluate("Our model", samples.map((s) => ({ p: s.model, n: 1, wins: s.won ? 1 : 0 })));
evaluate("Market, closing line", samples.map((s) => ({ p: s.close, n: 1, wins: s.won ? 1 : 0 })));
