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
import { loadHistory, walk } from "@/server/projections/history";
import { GOALIE_PARAMS, PREGAME_COEFFICIENTS, RATING_PARAMS, ROSTER_PARAMS } from "@/server/projections/pregame-model";
import { logit, pregameHomeWinProbability } from "@/lib/projections/ratings";
import { PROVIDERS } from "@/server/ingestion/espn/odds";

config({ path: [".env.local", "../.env.local"], quiet: true });

const FIRST_ODDS_SEASON = 2022;

// Best book per game: the PROVIDERS order (ESPN BET, DraftKings, Caesars, MGM).
const providerRank = Object.keys(PROVIDERS)
  .map((id, i) => `when '${id}' then ${i}`)
  .join(" ");

const ODDS_SQL = `
select distinct on (game_id) game_id, home_probability_open::float8 as open, home_probability_close::float8 as close
from game_odds
where home_probability_close is not null
order by game_id, case provider_id ${providerRank} else 99 end`;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const history = await loadHistory(client, 2008, new Date().getFullYear());
const { rows: odds } = await client.query<{ game_id: string; open: number | null; close: number }>(ODDS_SQL);
const lines = new Map(odds.map((o) => [o.game_id, o]));

// Our pregame probability for every game, from ratings as they stood before it.
interface Sample {
  season: number;
  won: boolean;
  model: number;
  open: number | null;
  close: number;
}
const samples: Sample[] = (await walk(history, { rating: RATING_PARAMS, goalie: GOALIE_PARAMS, roster: ROSTER_PARAMS })).flatMap((p) => {
  const line = lines.get(p.game.game_id);
  if (p.game.season < FIRST_ODDS_SEASON || !line) return [];
  return [{ season: p.game.season, won: p.game.home_won, model: pregameHomeWinProbability(p.home, p.away, PREGAME_COEFFICIENTS, p.rest), open: line.open, close: line.close }];
});
await client.end();

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
