# API notes

Handlers live in `app/src/server/api/`, with thin route files in
`app/src/routes/api/`. Responses are camelCase JSON with nulls included, as
described by `app/src/types/`.

## Structure

| File | Endpoints |
|---|---|
| `teams.ts` | `/api/seasons`, `/api/teams/*` (roster, lines, chemistry, seasons, special teams, score state, game log) |
| `shots.ts` | `/api/teams/{abbrev}/shots`, `/against`, `/shooters` |
| `players.ts` | `/api/players/*` (search, detail, stats, game log, linemates, shots, rolling stats, workload, compare) |
| `standings.ts` | `/api/standings/*` (official, power rankings, analytics, category rankings) |
| `special-teams.ts` | `/api/special-teams/*` |
| `stats.ts` | `/api/stats/*` |
| `games.ts`, `deserve-to-win.ts` | `/api/games/*` |
| `game-live.ts` | `/api/games/{id}/live` (game centre model from play-by-play and shift charts) |
| `game-score.ts`, `win-probability.ts` | Game Score and in-game win probability models used by the game centre |
| `game-scores.ts` | `/api/stats/game-scores/nightly`, `/single-games` (stored per-game Game Scores) |
| `projections.ts` | `/api/projections/playoff-odds`, `/games` (stored playoff odds and team ratings) |
| `tracking.ts` | `/api/players/{id}/tracking`, `/api/teams/{abbrev}/tracking`, `/api/tracking/leaders` (NHL EDGE, read at request time) |
| `shot-types.ts` | `/api/players/{id}/shot-types`, `/api/teams/{abbrev}/shot-types` |
| `situations.ts` | `/api/teams/{abbrev}/situations`, `/api/players/{id}/rest` (goalies) |
| `season-race.ts` | `/api/standings/race`, `/api/standings/travel` (from `games`) |
| `playoffs.ts` | `/api/playoffs/bracket` |
| `records.ts` | `/api/records/milestones`, `/officials`, `/attendance`, plus franchise people (team history), milestones, Hall of Fame and goalie playoff records (player detail) and the draft lottery (`/api/draft`) |
| `streaks.ts` | `/api/stats/streaks` |
| `trophies.ts` | `/api/trophies`, `/api/trophies/{slug}`, plus player awards (player detail) and franchise award winners (team history) |
| `milestones.ts` | `/api/milestones` |
| `goal-replay.ts` | `/api/games/{id}/goals/{eventId}/replay` |
| `history.ts` | `/api/draft`, `/api/teams/{abbrev}/history`, plus the all-time record in game previews and the draft pick on player detail |
| `nhl-client.ts` | request-time NHL API reads (10 s timeout; failures degrade to empty results) |
| `handler.ts`, `query.ts`, `errors.ts`, `format.ts`, `constants.ts` | shared plumbing |

`apiHandler(tier, fn)` parses the query string (case-insensitive names;
unparseable numbers/booleans and missing required parameters are a 400 with
code `INVALID_PARAMETER`), turns thrown `HttpError`s into `{ error, code }`
responses, and sets the cache header.

## Caching

Each GET route sets a cache tier
(`Cache-Control: public, max-age=B, s-maxage=N, stale-while-revalidate=S`)
and the cache tag `api` (`Vercel-Cache-Tag`):

| Tier | N (CDN) | Used by |
|---|---|---|
| `static` | 24 h | teams list/detail, game shots |
| `ingested` | 24 h | endpoints that read only our DB: players, stats, lines, team stats, power rankings, standings analytics, special teams, game scores, projections |
| `semiStatic` | 6 h | seasons, games by date, yesterday, final-game detail, boxscore and game centre, deserve-to-win |
| `team` | 30 min | endpoints that also call the NHL API: official standings, category rankings, game preview, goalie form |
| `search` | 5 min | player search |
| `live` | 15 s | today, live, game detail, boxscore and game centre (`/api/games/{id}/live`) until the game is final |

- Every cron job invalidates the `api` tag when it succeeds, so data that only
  changes through ingestion can stay cached for a day. Invalidation marks
  entries stale: the next request gets the old copy while the CDN refetches.
- `S` is at least 24 h (`live`: 15 s), so after `N` runs out visitors still get
  an instant stale copy while it refreshes, instead of waiting on the DB.
- `B` (browser cache) is `min(N, 5 min)`; `live` is 0.
- Errors are `no-store`. The CDN keys on the full URL.
- Under `npm run dev` every API response is `no-store`, so a changed response
  shows on the next request. (Browsers honour `stale-while-revalidate`, so
  with the production header an old copy could keep showing in development.)
- The UI's React Query default `staleTime` is 5 minutes (live hooks set their
  own).
- Today's scoreboard and live game detail don't query the DB: a game's shots
  are ingested the morning after it, so there are none to read yet. That keeps
  the scores strip (server-rendered on every page, polled while games are on)
  and live polling from waking Neon.
- Pages (HTML) are CDN-cached too: `s-maxage=300, stale-while-revalidate=1 day`,
  browsers always revalidate, same `api` tag (`src/lib/cache-headers.ts`).
  Server-rendered pages embed API data, so the cron invalidation covers them.

## Numbers

- Arithmetic uses JS doubles. Rounded outputs use `round()` (banker's
  rounding on the value's shortest decimal form, via decimal.js), so a stored
  `0.125` rounds to `0.12`. Unrounded ratios (PDO, percentages the UI formats
  itself) can carry floating-point noise in the last digits.
- Raw SQL returns `numeric` as strings; handlers convert with `Number()`.
  Drizzle-typed columns are already numbers (`mode: "number"`).

## Behavior notes

- Tracking (`/api/players/{id}/tracking`, `/api/teams/{abbrev}/tracking`,
  optional `?season=` from 2021 on): NHL EDGE numbers reshaped, never
  computed here. Players get `percentile` (0-1, oriented so higher is
  better: less defensive-zone time and fewer goals against score high);
  teams get `rank` (1 = best). With no season, the NHL's "now" falls back to
  the latest season with data, and `season` says which one it is.
  `{ tracking: null }` when the NHL has none. EDGE keys teams by NHL team ID
  (`NHL_TEAM_IDS`). `team` cache tier.
- Tracking responses also carry `rinkAreas`: the NHL's 17 EDGE areas
  ("High Slot", "L Circle", "Beyond Red Line"…) with shots on goal (skaters,
  teams) or save % and saves (goalies), and the percentile or rank.
- `/api/tracking/leaders?season=&position=all|F|D`: six EDGE top 10s (top
  speed, hardest shot, distance, distance per 60, high-danger shots on goal,
  offensive-zone time). The rows have no player ID, only a slug ending in it
  (`idFromSlug`). With no season it uses the season in progress, falling
  back to last season before any games. Goalie and team top 10s aren't used:
  their URLs aren't known. `team` tier.
- Shot types (`/shot-types`): the stats API's `skater/shottype` or
  `team/shottype` for the latest regular season with shots (this one or
  last), each type with the league's shooting % on it (every team summed).
  Players' rare types (bat, poke, between the legs, cradle) fold into
  "Other", which has no league number. `team` tier.
- `/api/teams/{abbrev}/situations?season=`: records when scoring or
  conceding first, leading or trailing after one and two, in one-goal games
  and when outshooting or outshot (`team/scoretrailfirst`, `leadingtrailing`,
  `goalgames`, `outshootoutshotby`), and by days of rest (`daysbetweengames`,
  3+ days folded). Ranks are by points % among teams with games in that
  situation (ties share a rank); the league figure pools every team.
  `/api/players/{id}/rest`: a goalie's save % by days of rest
  (`goalie/daysrest`), with the league's weighted by games because the report
  has no shots per rest length. Both `team` tier.
- `/api/standings/race?season=`: each team's points after every date it
  played, from final regular-season `games` (2 a win, 1 an OT/SO loss).
  `/api/standings/travel`: great-circle miles between consecutive game
  cities for the whole season and so far (every game counts as played in the
  home team's arena, starting at home), back-to-backs and the longest road
  trip. Arena coordinates are a static table (`ARENAS`). Both `ingested`.
- `/api/playoffs/bracket?season=`: the NHL bracket (`playoff-bracket/{end
  year}`), rounds 1-4, each round's series split into halves by letter (East
  on the left in most years; divisions in 2020-21). The 2020 qualifying
  round is left out. Defaults to this season's playoffs once they start,
  else last season's. `team` tier.
- Trophies (`ingested` tier): `/api/trophies` lists every trophy with its
  latest winners (two when shared); `/api/trophies/{slug}` (the NHL's slug,
  e.g. `hart-memorial`) has every season's winners, runners-up and finalists,
  newest first, with the team code that season from `franchise_seasons`.
  `race` is this season's leaders in the closest stat, only where there's an
  honest one: points (Art Ross) and goals (Rocket Richard) decide those
  trophies; Game Score (Hart, Ted Lindsay; defence for the Norris), GSAx
  (Vezina) and rookie points (Calder) are labelled as our numbers for voted
  awards. Player detail adds `awards` (wins and finalist seasons per
  trophy); team history adds `awards` (player and coach winners with the
  franchise).
- `/api/records/milestones?kind=points-1000|goals-500|season-points-100|season-goals-50`:
  every member of a club, newest first, with the game it came in (players'
  age and games played then; season clubs add the final season total) and
  the counts for all four. Player detail adds `milestones`, `hallOfFame`
  (Hockey Hall of Fame only) and, for goalies, `goaliePlayoffs` (Game 7 and
  playoff overtime record). Team history adds `people` (captains, head
  coaches with Cups and Hall of Fame status, GMs, retired numbers);
  `/api/draft` adds `lottery` and `inHallOfFame` on picks. `/officials` is
  active referees and linespeople; `/attendance` is league attendance by
  season. All `ingested`.
- `/api/stats/streaks?playerId=`: current regular-season point streaks and
  Game Score 1.0+ streaks from `skater_games`, three games or more (any
  length for one player), for players who've played in the last week. A
  streak isn't followed past a team's latest final game with no stored rows
  (the nightly job works through a backlog, and some games have no NHL shift
  data); `atLeast` marks streaks cut short that way. `ingested`.
- Box score and game centre goals carry the NHL.com highlight link
  (`highlightUrl`) once the NHL posts one.
- `/api/milestones`: the NHL stats API's milestone lists pick candidates,
  but their totals lag a week or more, so current career totals come from
  one aggregate stats request per position. Only headline targets (500
  points, 200 goals, 300 assists, 700 games; 150 wins, 30 shutouts, 500
  games for goalies), reached ones dropped, one per player, ranked by games
  away at the career rate. A 502 (uncached) when the NHL is down. `team` tier.
- `/api/games/{id}/goals/{eventId}/replay`: the NHL's goal tracking sprite
  (about 14 s at 10 frames a second), converted from inches to rink feet
  centred on the red line with y running down. The sprite host (Cloudflare)
  only answers with a `Referer: https://www.nhl.com/` and a named user agent.
  Game centre goals carry `eventId` and `hasReplay` (play-by-play
  `pptReplayUrl`, a top-level play field). 404 when there's no tracking.
  `static` tier.
- `/api/draft?year=&team=`: one class (default the latest), optionally one
  current team's franchise picks, with NHL careers from `player_careers`;
  `hasPlayerPage` says whether we have the player (2008-09 on).
  `/api/teams/{abbrev}/history`: every franchise season and the first-round
  picks of its last 15 drafts. Game previews add
  `headToHead.allTime.{regular,playoffs}` from the away team's side; player
  detail adds `draft` (latest selection, null if undrafted). `ingested` tier.

- Injuries and transactions (ESPN, refreshed by the `espn-*` crons, `ingested`
  tier): `/api/teams/{abbrev}/injuries` (current injuries, most serious
  first: IR, out, suspended, day-to-day) and
  `/api/teams/{abbrev}/transactions?limit=` (newest first, default 25, max
  100). Every endpoint that shows availability reads the same open stints
  through `injuriesByPlayer` (`src/server/api/injuries.ts`): player detail
  adds `injury` and `transactions`; current-season rosters add `injury` per
  player (older seasons don't, since injuries are today's); game previews of
  games today or later add `injuries.{home,away}` and `injury` on goalies and
  hot players; the game centre's scratches carry `injury` for today's games;
  `/api/milestones` drops players who won't play (IR, out, suspended) and
  flags day-to-day ones. An injury's `earliestReturn` is ESPN's `returnDate`: the earliest the
  player can return (when an IR stint can end, the next game for
  day-to-day), not a forecast; stored as `expected_return`. Its `since` is the ET date we first saw it,
  or ESPN's last update if earlier (players already listed when tracking
  began). `game_odds` has no route on purpose.

- `shotId` in shot responses is `{gameId}-{eventId}`. MoneyPuck's `shotID`
  isn't unique (see `SCHEMA_NOTES.md`), and the UI uses it as a React key.
- Team/player shots: `goalsOnly` is applied before `limit`.
- Leaderboards: nullable sort columns (xG/60, FF%, on-ice Sh%/Sv%) sort NULLs
  last. Goalie leaderboards for `goalieTime`, `goalsAgainst` and `xga` sort by
  that stat. `gameScore` ranks by Game Score per game from the `all` row
  whatever the situation, and like `corsiPct` needs the minimum ice time.
- Game centre skaters carry `gameScore` (`total`, `scoring`, `onIce`,
  `other`) from `game-score.ts`: individual stats in all situations plus
  on-ice attempts and goals at 5v5 (both goalies in), the same definition as
  MoneyPuck's season value. Primary/secondary assists come from play-by-play
  goal events; any the feed doesn't attribute count as secondary.
- Game centre `winProbability` is the home team's chance (0-1) every 20 s,
  with two points at each goal (before and after) and a last point at 1 or 0
  once the game is final. The model (`win-probability.ts`) is a logistic fit
  on MoneyPuck shots by time left, goal difference, manpower and pulled
  goalies; refit with `npx tsx scripts/fit-win-probability.ts --write`.
  MoneyPuck's own `homeWinProbability` column is published empty.
- `/api/stats/game-scores/nightly` defaults to the latest date in
  `skater_games`; `gamesWithScores` vs `gamesFinal` tells the UI how many of
  that night's games are missing (no NHL shift data). `/single-games` takes
  `season`, `position` (`F`/`D`) and `playoffs`.
- `/api/projections/playoff-odds` serves the latest run, with
  `makePlayoffsChange` against the previous run (null on the first) and that
  day's games with each team's odds if it wins or loses. `/games?date=`
  (required) computes pregame odds from the ratings of the latest run on or
  before that date; the game centre applies them to `winProbability` in the
  browser (the model's pregame shift fades linearly to zero by the end of
  regulation, so this is exact and live polling stays off the database).
- Player game log (`/api/players/{id}/game-log?season=&playoffs=`): the
  NHL game log (games and box score lines), oldest first, with our final
  score and result, xG (skaters) or xGA/GSAx (goalies) from stored shots, and
  for skaters the stored Game Score and its parts (null for games without
  NHL shift data). `available: false` when the NHL request fails. `team`
  cache tier, because the NHL log updates after each game.
- Player stats return `gameScore` (season total) on `all` rows only; it's null
  for other situations. Season percentiles include `gameScorePerGame`,
  computed on request rather than stored in the `season_percentiles` view.
- Default season where none is passed: the season in progress (October on).
- Deserve-to-win runs a Monte Carlo seeded from the game ID, so a game always
  returns the same numbers. It runs 10,000 simulations once over the whole
  game and reads the result after each shot.
- Team game log (`/api/teams/{abbrev}/games`): `team_games` rows for "all"
  and "5on5", one entry per game. The final score and result come from
  `games` (shootout winners included); the per-situation goals are
  MoneyPuck's, which leave shootouts out. Rolling form is computed in the UI
  (`lib/team-form.ts`).
- Power rankings form and schedule fields come from `team_games` (5 on 5,
  regular season), as 0-1 fractions: `fiveOnFiveXGoalsPct` (season so far),
  `recentXGoalsPct` (last 10 games), `scheduleStrength` (average season xG
  share of opponents played) and `remainingScheduleStrength` (the same for
  opponents still on the schedule in `games`; null once there are none). The
  xG% column (`xGoalsPct`) is all situations, so compare form against
  `fiveOnFiveXGoalsPct`.
- GET handlers don't write to the DB. The schedule cron stores games from
  yesterday through the next 7 days; game detail and preview fall back to a
  read-only NHL lookup for games not stored yet.
- 404s from `/api/games/*` have a JSON body (`GAME_NOT_FOUND`). Non-integer
  `{id}`/`{age}`/`{season}` route values are a JSON 404 (`NOT_FOUND`).
- `/api/health` checks the database (`select 1`) and returns
  `{ status: "ok", db: "ok", latencyMs }`, or 503 when the DB is unreachable.
- `startTimeUtc` is ISO-8601 UTC with milliseconds (`2026-10-10T17:00:00.000Z`).
- `/api/games?date=` accepts only `YYYY-MM-DD`; anything else means today (ET).
- Power rankings, standings analytics and category rankings estimate a
  record from goals (Pythagorean wins, 10% of losses as OTL) and special
  teams from ice time (one opportunity per 2 minutes).
- Official standings, records/streaks shown on game cards, and category
  rankings' points always come from the NHL's current standings, even for
  past seasons (the NHL API's historical standings are unreliable).
- `/api/special-teams/team-rankings` also carries penalties drawn/taken from
  the `all` situation row (drawn = MoneyPuck's `penaltiesAgainst`, taken =
  `penaltiesFor`), per 60 of all-situations ice time, plus 5-on-4/4-on-5
  minutes per game and goals per 60.
- `/api/teams/{abbrev}/home-away` sums `team_games` by `is_home` for every
  team in one query (so `league.home`/`league.away` come along). Records come
  from `games` scores; 5v5 rates from the `5on5` rows, PP/PK from `5on4`/`4on5`.
- `/api/teams/{abbrev}/home-away-history` is the same split for every season,
  team only. The league's by-season split is `/api/stats/home-away`, a
  separate endpoint so all 32 team pages share one cached scan of
  `team_games` (~0.6s cold) instead of repeating it.
- `/api/special-teams/penalties-by-venue` is every team's home and road
  penalty totals for every season (raw counts and seconds, ~30 KB gzipped),
  one cached scan of `team_games`. The client turns them into rates
  (`src/lib/venue-penalties.ts`) for the league page's Home/Road filter and
  season-by-season heatmap, so all games / home / road need no extra request.
  The same data drives "Calls by arena": a team's home games are its arena,
  so home drawn = calls on visitors and home taken = calls on the home team.
  Multi-season ranges scale each arena by the league's calls per game in the
  seasons it hosted (expansion teams only played in the lower-penalty era).
  There's no arena column: neutral-site games count for the home team.
- `/api/teams/{abbrev}/special-teams` includes `penalties` (drawn/taken per
  60 of all-situations time, ranked 1 = draws most / takes fewest / best
  net), or null when the team has no `all` row for the season.
- Penalty-kill `savePct` in `/api/teams/{abbrev}/special-teams` is a 0-1
  fraction rounded to 1 dp (so usually 0.8 or 0.9).
- Goalie recent form counts every dressed goalie with a `saves/shots` line
  in the boxscore, including backups who didn't play (`0/0`).
- Boxscore and game centre responses use the live tier until the NHL marks
  the game final, then `semiStatic`. The boxscore includes `gameState` so the
  UI polls only while a game is in progress (`LIVE`, `CRIT`, or `OVER`: ended
  but not yet official).
- `/api/games/{id}/live` fetches the NHL gamecenter landing, boxscore,
  play-by-play and right-rail feeds, the shift chart, standings and both
  teams' club stats, then derives attempts, xG, high-danger chances, on-ice
  stats, lines and strength splits itself. During a game its xG is a small
  distance/angle/shot-type logistic model (`expectedGoal`), fitted so totals
  match MoneyPuck's on average (`meta.xgSource: "model"`). Once the game is
  final and MoneyPuck's shots are in the DB, each unblocked attempt takes
  MoneyPuck's xG instead (`applyReferenceXg`: same shooter within 6 s, then
  same team within 2 s; attempts MoneyPuck lacks get 0), so totals match
  MoneyPuck's to within a shot or two where the two feeds disagree
  (`xgSource: "moneypuck"`). Final responses are cached 6 h, and the cron
  jobs' cache purge picks up MoneyPuck data when it lands. Shift data trails play-by-play by a few
  minutes, so on-ice and line stats lag slightly during live games. Shootout
  plays are excluded.
- `/api/stats/homepage` isn't used by the UI.
