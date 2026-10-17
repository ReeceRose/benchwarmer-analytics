// Compares today's playoff odds simulation with MoneyPuck's: ours as is, with
// MoneyPuck's own team ratings (what's left is simulation mechanics), and
// with our strengths squeezed toward average. Read-only: downloads
// MoneyPuck's simulation and power-rankings CSVs once each and writes nothing.
//
//   npx tsx scripts/compare-moneypuck.ts [--sims 4000]
//
// Distance is the mean absolute gap per team, in percentage points, across
// playoffs, each round and the Cup (Cup weighted x4 so it isn't swamped).
import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { closePool, getPool } = await import("@/server/ingestion/db");
const { currentSeason } = await import("@/server/ingestion/normalize");
const { todayEastern } = await import("@/server/ingestion/nhl");
const { getStandings } = await import("@/server/api/nhl-client");
const { OVERTIME_RATE, PREGAME_COEFFICIENTS, RATING_PARAMS } = await import("@/server/projections/pregame-model");
const { logit, teamStrength } = await import("@/lib/projections/ratings");
const { remainingGames, simTeams, STRENGTH_SD, teamRatings } = await import("@/server/projections/run");
const { simulateSeason } = await import("@/lib/projections/simulate");
type Rating = import("@/lib/projections/ratings").Rating;
type TeamOdds = import("@/lib/projections/simulate").TeamOdds;

const { values } = parseArgs({ options: { sims: { type: "string", default: "4000" } } });
const SIMS = Number(values.sims);
const MP = "https://moneypuck.com/moneypuck";
const ALIASES: Record<string, string> = { "L.A": "LAK", "N.J": "NJD", "S.J": "SJS", "T.B": "TBL" };

async function csv(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "benchwarmer-analytics (model comparison)" } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const [header, ...lines] = (await res.text()).trim().split("\n").map((l) => l.split(","));
  return lines.map((l) => Object.fromEntries(header.map((h, i) => [h, l[i]])));
}

const KEYS = ["makePlayoffs", "winRound1", "winRound2", "winConference", "winCup"] as const;
const MP_KEYS = ["madePlayoffs", "round2", "round3", "round4", "wonCup"];

const mpSims = await csv(`${MP}/simulations/simulations_recent.csv`);
const mpPower = await csv(`${MP}/powerRankings/gen2Model/rankings_current.csv`);
const theirs = new Map(
  mpSims.filter((r) => r.scenerio === "ALL").map((r) => [ALIASES[r.teamCode] ?? r.teamCode, { points: Number(r.points), odds: MP_KEYS.map((k) => Number(r[k])) }]),
);
const theirStrength = new Map(mpPower.map((r) => [ALIASES[r.teamCode] ?? r.teamCode, Number(r.avg_overall_prediction)]));

function distance(odds: TeamOdds[]) {
  let roundGap = 0;
  let cupGap = 0;
  let pointsGap = 0;
  for (const o of odds) {
    const m = theirs.get(o.abbrev)!;
    KEYS.forEach((k, i) => {
      const gap = Math.abs(o[k] - m.odds[i]) * 100;
      if (k === "winCup") cupGap += gap;
      else roundGap += gap;
    });
    pointsGap += Math.abs(o.pointsAvg - m.points);
  }
  const n = odds.length;
  return { score: (roundGap + 4 * cupGap) / (8 * n), playoffs: roundGap / (4 * n), cup: cupGap / n, points: pointsGap / n };
}

const db = getPool();
try {
  const season = currentSeason();
  const today = todayEastern();
  const [standings, remaining] = await Promise.all([getStandings(), remainingGames(db, season, today)]);
  const seed = Number(today.replaceAll("-", ""));

  const run = (ratings: Map<string, Rating>, strengthSd: number, priorGames: number, scale = 1) => {
    const scaled = new Map([...ratings].map(([t, r]) => [t, { ...r, xgd: r.xgd * scale, gd: r.gd * scale }]));
    const teams = simTeams(standings, scaled);
    return simulateSeason(teams, remaining, { sims: SIMS, seed, coefficients: PREGAME_COEFFICIENTS, overtimeRate: OVERTIME_RATE, strengthSd, priorGames }).odds;
  };
  const show = (label: string, odds: TeamOdds[]) => {
    const d = distance(odds);
    const top = odds.reduce((a, b) => (b.winCup > a.winCup ? b : a));
    console.log(
      `${label.padEnd(58)} score ${d.score.toFixed(2)}  playoffs/rounds ${d.playoffs.toFixed(2)}  cup ${d.cup.toFixed(2)}  points ${d.points.toFixed(1)}  top ${top.abbrev} ${(top.winCup * 100).toFixed(1)}%`,
    );
    return d.score;
  };

  const ours = await teamRatings(db, season);
  console.log(`${season} season, ${today}, ${remaining.length} games left, ${SIMS} sims per run\n`);
  show(`current (prior ${RATING_PARAMS.priorGames}, carry ${RATING_PARAMS.carryOver}, sd ${STRENGTH_SD})`, run(ours, STRENGTH_SD, RATING_PARAMS.priorGames));

  // MoneyPuck's own ratings in our simulator: whatever gap is left is simulation mechanics, not ratings.
  // Their rating is the chance of beating an average team, so its logit is the strength gap; put it all on xgd.
  const theirRatings = new Map([...theirStrength].map(([t, p]) => [t, { xgd: logit(p) / PREGAME_COEFFICIENTS[1], gd: 0, gamesPlayed: 0 }]));
  for (const sd of [0, 0.1, 0.2, 0.26]) show(`MoneyPuck ratings, sd ${sd}`, run(theirRatings, sd, RATING_PARAMS.priorGames));

  // Our ratings in their spread: how much of the gap is how far apart we rate teams.
  for (const scale of [0.9, 0.8, 0.7]) show(`ours with strengths x${scale}`, run(ours, STRENGTH_SD, RATING_PARAMS.priorGames, scale));

  // Biggest remaining gaps, with each side's strength (chance of beating an average team).
  const odds = run(ours, STRENGTH_SD, RATING_PARAMS.priorGames);
  const strengthOf = (r: Rating) => 1 / (1 + Math.exp(-teamStrength(r, PREGAME_COEFFICIENTS)));
  console.log("\nBiggest playoff-odds gaps (ours - theirs), with strength vs an average team:");
  const gaps = odds.map((o) => ({ o, gap: o.makePlayoffs - theirs.get(o.abbrev)!.odds[0] })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  for (const { o, gap } of gaps.slice(0, 10)) {
    const r = ours.get(o.abbrev)!;
    console.log(
      `  ${o.abbrev}  playoffs ${(o.makePlayoffs * 100).toFixed(0).padStart(3)}% vs ${(theirs.get(o.abbrev)!.odds[0] * 100).toFixed(0).padStart(3)}% (${gap > 0 ? "+" : ""}${(gap * 100).toFixed(0)})  strength ${strengthOf(r).toFixed(3)} vs ${theirStrength.get(o.abbrev)!.toFixed(3)}  roster ${(r.roster ?? 0).toFixed(2)} goalie ${(r.goalie ?? 0).toFixed(2)}`,
    );
  }
} finally {
  await closePool();
}
