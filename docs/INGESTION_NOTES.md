# Ingestion notes

Code in `app/src/server/ingestion/`. This records how ingestion works and the
data quirks it handles.

## Sources

| Data | URL | Notes |
|---|---|---|
| Season summaries | `moneypuck.com/moneypuck/playerData/seasonSummary/{season}/{regular\|playoffs}/{teams,skaters,goalies,lines}.csv` | Playoff files 404 until the playoffs start (treated as "no data") |
| Player bios | `moneypuck.com/moneypuck/playerData/playerBios/allPlayersLookup.csv` | |
| Team games | `moneypuck.com/moneypuck/playerData/careers/gameByGame/all_teams.csv` | Every season in one file (~130 MB, ~30 MB gzipped); one row per team, game and situation |
| Shots | `peter-tanner.com/moneypuck/downloads/shots_{season}.zip` | MoneyPuck's official shot-data mirror; ~20 MB zip / ~120k rows per season |
| Games | `api-web.nhle.com/v1/schedule/{date}` | Returns one week per request |
| ESPN injuries | `site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries` | Undocumented. A snapshot of every team's list; entries name ESPN athletes only (ID in the player-card link) |
| ESPN athletes | `sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/athletes/{id}` | Date of birth, for matching ESPN athletes to our players; asked once per athlete |
| ESPN transactions | `site.api.espn.com/.../transactions?dates=YYYYMMDD-YYYYMMDD&limit=500&page=n` | Free text with a date and team, no IDs |
| ESPN scoreboard and odds | `site.api.espn.com/.../scoreboard?dates=YYYYMMDD`, `sports.core.api.espn.com/.../events/{id}/competitions/{id}/odds` | Sportsbook moneylines with open and close, kept after the game; from 2022-23 |
| NHL records | `records.nhl.com/site/api/{franchise,franchise-season-results,all-time-record-vs-franchise,draft,skater-career-scoring-regular-season,goalie-career-stats,trophy,award-details}` | Each list comes back whole with `limit=-1` (the draft is ~13k rows); career lists use `franchiseId=null` for whole-career rows |

Downloads are sequential, with a descriptive User-Agent and exponential
backoff on network errors, 429 and 5xx (`ingestion/http.ts`).

## Steps

All steps are idempotent upserts. Unchanged rows aren't rewritten
(`IS DISTINCT FROM`), so a re-run writes ~0 rows. Each run is logged in
`sync_runs`.

| Step (`sync_runs.step`) | Work |
|---|---|
| `bios` | Player bios → `players` |
| `teams` | `teams.csv` "Team Level" rows → `teams`, `team_seasons` (regular + playoffs) |
| `skaters` | → `players` (basic info), `skater_seasons` (+ derived rates), `skater_season_advanced` |
| `goalies` | → `players`, `goalie_seasons` (+ save %, GAA, GSAx) |
| `lines` | → `line_combinations` (regular season only, see below) |
| `team_games` | `all_teams.csv` → `team_games` (one season, or every season in one pass) |
| `shots` | → `shots` (full, or incremental for cron) |
| `games` | NHL schedule → `games` |
| `score_state` | `shots` goals → `game_score_state_times` |
| `skater_games` | final games without rows → NHL shift chart, box score and play-by-play → `skater_games` (per-game Game Score), newest first, up to 45 games a run |
| `projections` | NHL standings + `team_games` ratings + roster talent (`skater_seasons`/`skater_season_advanced`) + goaltending (`shots`) + remaining `games` (with back-to-backs) → 20,000-season simulation → `playoff_odds`, `playoff_odds_games` |
| `nhl_records` | NHL records → `franchises`, `franchise_seasons` (regular seasons with playoff result), `franchise_head_to_head`, `draft_picks`, `player_careers` (with goalie playoff records), `trophies`, `award_winners`, `franchise_people`, `hall_of_fame`, `milestone_moments`, `officials`, `coaches`, `league_attendance`, `draft_lotteries`; ~55k rows, one request per list |
| `espn_injuries` | ESPN injury list → `player_injuries` stints (reconciled: new players open a stint, listed ones update, missing ones resolve) and `espn_players` |
| `espn_transactions` | ESPN transactions for the last 3 days (ET) → `transactions` |
| `espn_odds` | Yesterday's and today's games: ESPN scoreboard (event IDs, matched on date and teams) → each event's odds → `game_odds` |
| `views` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` both views, then `ANALYZE` (Neon resets autovacuum's counters when the compute scales to zero, so planner stats would otherwise go stale) |

Order within a season matters: lines resolve players through that season's
skater rows (name fallback only), and score-state reads shots. `team_games`
needs `teams` (foreign key) and `games` (opponent repairs, below).

## Cron (Vercel)

Defined in `app/vite.config.ts` and emitted into the Vercel build output.
Every route requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends
it) and accepts `?season=YYYY` for manual re-runs.

| Route | UTC | Work |
|---|---|---|
| `/api/cron/schedule` | 11:00 daily | games from yesterday through the next 7 days (ET) |
| `/api/cron/season-stats` | 12:00 daily | teams, skaters, goalies, lines, team games for the current season |
| `/api/cron/shots` | 13:00 daily | incremental shots + score-state for the touched games |
| `/api/cron/derived` | 14:00 daily | full-season score-state (only changes written) + view refresh + `ANALYZE` |
| `/api/cron/game-scores` | 15:00 daily | `skater_games` for final games without rows (last night's plus any backlog) |
| `/api/cron/projections` | 16:00 daily | today's playoff odds (same day and inputs → same seed → re-runs write nothing) |
| `/api/cron/espn-morning` | 13:00 daily | ESPN injuries, transactions and odds (last night's closing lines, today's openers), each step run even if another fails |
| `/api/cron/bios` | Sun 17:00 | player bios |
| `/api/cron/history` | Sun 18:00 | NHL records: franchise history, head-to-head, draft picks, careers |
| `/api/cron/espn-evening` | 21:00 daily | ESPN injuries and transactions again, for same-day news |
| `/api/cron/catch-up` | 22:00 daily | re-runs any daily job (schedule through projections, plus the ESPN morning job) with a step that hasn't succeeded today (UTC), in the usual order, within a 150 s budget; nothing to do on a normal day |

The ESPN times are 9 AM and 5 PM Eastern in daylight time (8 AM and 4 PM in
winter: cron schedules are UTC). The jobs live in `src/server/cron-jobs.ts`,
shared by the routes and the catch-up. A job whose steps are independent
(the ESPN ones) runs them all and answers 500 if any failed
(`runIndependently`), still invalidating the cache for the ones that worked.

Incremental shots: rows are imported only for games with no stored shots,
plus games from the last 3 days (MoneyPuck revises recent data). The season
zip is still downloaded and parsed (~5-15 s), but only the new games are
written.

Vercel Hobby runs crons once a day at most and only guarantees the hour, so
each job gets its own hour to keep the order. Each step still tolerates
running before the previous one, and the shots route computes score-state
itself. MoneyPuck publishes last night's data around 10:30 UTC (6:30 AM ET),
so MoneyPuck steps start at 12:00 UTC; an earlier run fetches the previous
day's files and leaves the site a day behind.

## Backfill

```bash
cd app
npm run backfill -- --yes                         # 2008 → current, every step
npm run backfill -- --from-season 2024 --dataset shots,score_state --force --yes
```

Resumable: (step, season) pairs that already succeeded are skipped unless
`--force`. `team_games` runs after the season loop: a full-range run imports
every season in one pass (recorded with a null season), a narrower range runs
it per season (one download each). Views are always refreshed at the end. The backfill loads games
and score-state for every season too. It runs outside Vercel, so it can't
purge the API cache; run `vercel cache invalidate --tag api` afterwards (see
`DEPLOY_NOTES.md`).

ESPN (`scripts/espn.ts`): `injuries` runs the injury step;
`transactions --from 2022-09-01` backfills a month per request; `odds
--from 2022-10-01` backfills lines a date at a time (about 900 dates, ~35
minutes, 200 ms between games), skipping games that already have a closing
line unless `--force`, so it resumes. Injury history can't be backfilled:
ESPN only has today's list, so stints start from 2026-10-14.

## ESPN

ESPN's endpoints are unofficial and can change or vanish, so the code in
`ingestion/espn/` treats them defensively:

- **Checked shape.** Every response is parsed with zod. A wrong top-level
  shape fails the step with nothing written. Individual entries that don't
  parse are skipped and counted, but more than 10% (and more than two)
  fails the step, since that means the format changed.
- **No mass recovery.** Injuries are a snapshot, and players missing from
  it are marked recovered. If the list has fewer than half the open stints
  (once 20+ are open), or is empty, listed players are still updated but
  nobody is resolved and the step fails (`shouldResolve`). The update,
  insert and resolve are one SQL statement, so a run applies all or nothing.
- **Player matching.** ESPN gives only names and its own IDs. A match is
  name plus date of birth (one athlete request each, stored), then a
  same-last-name player born that day ("Mitch" vs "Mitchell"), then a unique
  name on the team, then a unique name; a unique name with a different
  birthday is no match. Unmatched athletes (about 1 in 10, almost all
  prospects with no NHL games, who aren't in `players`) are stored with a
  null player and re-matched each run. A failed athlete lookup matches on
  name alone that run. Matching never fails a step.
- **Injury IDs.** ESPN's injury `id` isn't unique (different players share
  one), so stints key on the athlete. Statuses: "Injured Reserve" (LTIR
  too) → `ir`, "Out", "Day-To-Day", "Suspension"; fields reading "Not
  Specified" are dropped, and comments under 20 characters ("ir") too.
- **Transactions.** No IDs, so the date, team and text are the key. The
  kind comes from the most specific sentence (IR moves first, then trades,
  waivers, recalls, assignments, signings), and the player from a position
  code followed by a capitalised name in that sentence ("Placed D Mattias
  Ekholm on injured reserve"). Plural codes ("Ds X and Y") yield only the
  first player. About 80% of rows get a player; the rest are mostly AHL
  players we don't have.
- **Odds.** Only ESPN BET (58), DraftKings (100), Caesars (45) and MGM (47)
  are kept. Older games list a dozen books, several of which (DraftKings'
  old ID 40, PointsBet, Unibet, Bet365) report puck-line prices as
  moneylines, and "Live Odds" entries are in-game prices. Each open or close
  pair must be within ±2000 with implied probabilities summing to 1.00-1.10,
  or that line is dropped. Probabilities are stored with the margin removed.
  Lines are only matched to stored regular-season and playoff games (by
  date and teams), so preseason and international games are skipped.
- **Per-game failures.** An odds request that fails is logged and the
  others go on; the step fails only if more than half did. The morning job
  runs injuries, transactions and odds independently.
- **Team codes.** ESPN uses NJ, SJ, TB, LA and UTAH; the injury list names
  teams by ESPN team ID only (`ESPN_TEAM_IDS`).

## Data quirks and decisions

- **Records HTML.** Franchise captains, coaches, GMs and retired numbers
  come as small HTML lists ("Name: tenure", "99 – Name (years)"); footnotes
  and "None" are dropped, and rows from an older, longer list are deleted.
  Lottery format and odds are reduced to plain text plus the odds chart's
  image URL. The Hall of Fame list mixes three halls (`officeId` 1 Hockey
  Hall of Fame, 2 US, 3 IIHF); only the first counts.
- **NHL records.** The head-to-head list includes early Stanley Cup
  opponents from other leagues (Victoria Cougars, Seattle Metropolitans);
  rows whose franchise isn't in the franchise list are skipped. A Cup
  (`won_cup`) is a season whose last playoff round played was the final and
  was won, so before 1927, when the NHL champion still played another league
  for the Cup, it marks the NHL title. Draft picks get their franchise through
  `franchise_seasons` (a team ID belongs to one franchise), so ATL picks
  belong to today's WPG.

- **Games.** The API doesn't write to the DB, so the schedule cron stores the
  coming week up front (see `API_NOTES.md`).
- **Shot keys.** MoneyPuck's `shotID` isn't unique: it restarts at 0 every
  season since 2018 (2008-2017 are numbered continuously), restarts mid-file
  in the in-progress season's file, and the 2008 file repeats some events
  under new shotIDs. Shots are keyed on `(game_id, event_id)`, and repeated
  events in a file are imported once.
- **Score-state clock.** MoneyPuck's `time` column is seconds since the start
  of the game (period 2 runs 1200-2400); it's converted to period-relative
  time. Each game sums to 3600 s plus OT played, and home/away are symmetric.
- **Line players.** `lines.csv` has a `lineId` that is the players' 7-digit
  NHL IDs concatenated; it's decoded exactly. Last-name matching would skip
  ~7% of lines (shared last names, accents such as "Valimaki" vs
  "Välimäki", mid-season trades), so it's only a fallback, with accent
  folding and a played-that-season tiebreak. Lines whose IDs can't be
  decoded and whose names are genuinely ambiguous (for example two Nylanders
  on TOR in 2024) are skipped and counted in the log.
- **Playoff lines.** `line_combinations` has no playoffs column and the lines
  API only serves regular season, so only regular-season line files are
  imported (a playoff import would overwrite regular-season rows).
- **Team games.** The cron downloads and parses the whole all-seasons file
  (~6 s) and keeps the current season. In 115 Phoenix home games (2011-2013)
  the home row lists ARI as its own opponent and says AWAY; such rows are
  treated as the home team's, with the opponent taken from the `games` table
  (skipped and counted if the game isn't stored).
- **Team stats.** The playoffs flag is passed through for team imports, so
  playoff rows never land as regular season.
- **Positions.** Bios store `L`/`R`, while season files use `LW`/`RW`, and
  forward filters (special teams, chemistry) only match `C`/`LW`/`RW`, so bio
  positions are normalized to `LW`/`RW`.
- **Current team.** Importing a season older than a player's newest stored
  season leaves `players.current_team_abbreviation` alone.
- **Score-state without shots.** Final games with no MoneyPuck shots yet are
  skipped until shots arrive. Home/away codes come from the shots themselves
  (same source as the goal team codes), and shootouts count the OT period.
- `players.position` / `current_team_abbreviation` are written by both bio
  and season imports and can disagree for a few hundred players (traded
  players, position labels). That produces small, harmless churn between the
  weekly bio run and the daily season runs.
- Team divisions use the current alignment for all seasons.
- **Missing shift charts.** The NHL publishes no shift data for some games
  (2026020006-0052, the first two weeks of 2026-27). Without shifts there are
  no 5v5 on-ice stats, so those games get no `skater_games` rows rather than a
  partial Game Score, and the step retries them each run (one request each)
  in case the NHL fills them in. The UI says how many games are missing.
- **84-game season.** 2026-27 has 1,344 regular-season games (84 per team);
  the simulation takes the schedule from `games`, so nothing assumes 82.
- **Market benchmark.** `scripts/evaluate-pregame-vs-market.ts` compares the
  pregame model with sportsbook lines (`game_odds`) by log loss and
  calibration, and fits a blend leaving one season out. Read-only.
- **Models.** `scripts/fit-win-probability.ts` and
  `scripts/fit-pregame-model.ts` regenerate the coefficient files
  (`win-probability-model.ts`, `projections/pregame-model.ts`) from our own
  data; `scripts/calibrate-season-sims.ts` backtests the simulation's
  `STRENGTH_SD` (`projections/run.ts`) against real playoff, round and Cup
  outcomes (`franchise_seasons`). All three are read-only. Refit once a
  season, after the playoffs.
- **Pregame model inputs** (`projections/ratings.ts`, fitted October 2026).
  Team stats (5v5 xG and goal differential, blended with last season), roster
  talent (`roster.ts`), goaltending (`goalies.ts`) and back-to-backs. Held out
  one season at a time over 2010-2025, rest improved log loss by 0.0016 and
  roster by 0.0004 in the first 20 games; goaltending added almost nothing
  once goal differential is in, so its weight is small. Season replays from
  ~8 games improved most (Cup log loss 0.129 → 0.124); from mid-season on
  the old and new models tie. Fading a rating's edge for later games (as
  MoneyPuck does) made backtests worse: the edge holds all season. The
  history walk (`projections/history.ts`) rates every game as of puck drop,
  except roster weights, which use the season's full ice time (per-game ice
  time only exists from 2025), so the roster term looks slightly better in
  backtests than it can be live.
- **Playoff odds sandbox** (`/playoff-odds/tune`). The projections step also
  saves what the sandbox simulates from (`SandboxInputs`: standings, each
  team's rating parts, the remaining schedule with back-to-backs, goalie
  injuries) in `projection_inputs`, keeping only the latest run. The browser
  re-blends the ratings with the reader's settings and runs
  `lib/projections/simulate.ts` in a web worker (`sandbox.worker.ts`), 5,000
  seasons a run. With default settings it matches the published odds to
  within simulation noise.
- **Goalie injuries (sandbox option)** (`projections/injuries.ts`,
  `lib/projections/goalie-outlook.ts`): goalies listed as out sit until
  ESPN's earliest return (two weeks without one; day-to-day goalies play)
  and their starts go to the team's other goalies. Its one weight,
  `STARTER_GAP_COEFFICIENT`, is fitted on top of the main model from who
  actually started in net (2010-2025, log loss 0.66898 → 0.66854 held out by
  season). The injury list itself can't be backtested (it starts October
  2026), so it's off in the published odds.
- **MoneyPuck comparison.** `scripts/compare-moneypuck.ts` runs today's
  simulation against MoneyPuck's published odds and team ratings (one
  download of each CSV). Read-only.
- **Backfills.** `npx tsx scripts/backfill-skater-games.ts --season 2026`
  fills a season's `skater_games` in one pass; `npx tsx
  scripts/run-projections.ts` runs today's projection by hand.
- **Game Score.** `skater_season_advanced.game_score` is MoneyPuck's season
  total. Only the `all` row is meaningful: the `5on5` row repeats the `all`
  value and the special-teams and `other` rows aren't a split of it. The API
  reads Game Score from the `all` row only. The value is individual stats
  in all situations plus on-ice attempts and goals at 5v5 (checked against
  Matthews 2024: 86.3), which is what `game-score.ts` computes per game.
- **Team names.** On "Team Level" rows MoneyPuck's `name` column is just the
  abbreviation, so `teams.name` comes from `TEAM_NAMES` in
  `src/lib/team-names.ts` (shared with the UI and the games API). Relocated
  franchises keep the name they last played under.
- Empty optional text values are stored as NULL.
- Derived decimals use decimal.js at 28 significant digits with banker's
  rounding.
