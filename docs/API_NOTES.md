# API notes

Handlers live in `app/src/server/api/`, with thin route files in
`app/src/routes/api/`. Responses are camelCase JSON with nulls included, as
described by `app/src/types/`.

## Structure

| File | Endpoints |
|---|---|
| `teams.ts` | `/api/seasons`, `/api/teams/*` (roster, lines, chemistry, seasons, special teams, score state) |
| `shots.ts` | `/api/teams/{abbrev}/shots`, `/against`, `/shooters` |
| `players.ts` | `/api/players/*` (search, detail, stats, linemates, shots, rolling stats, workload, compare) |
| `standings.ts` | `/api/standings/*` (official, power rankings, analytics, category rankings) |
| `special-teams.ts` | `/api/special-teams/*` |
| `stats.ts` | `/api/stats/*` |
| `games.ts`, `deserve-to-win.ts` | `/api/games/*` |
| `game-live.ts` | `/api/games/{id}/live` (game centre model from play-by-play and shift charts) |
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
| `ingested` | 24 h | endpoints that read only our DB: players, stats, lines, team stats, power rankings, standings analytics, special teams |
| `semiStatic` | 6 h | seasons, games by date, yesterday, final-game boxscore and game centre, deserve-to-win |
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
- The UI's React Query default `staleTime` is 5 minutes (live hooks set their
  own).
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

- `shotId` in shot responses is `{gameId}-{eventId}`. MoneyPuck's `shotID`
  isn't unique (see `SCHEMA_NOTES.md`), and the UI uses it as a React key.
- Team/player shots: `goalsOnly` is applied before `limit`.
- Leaderboards: nullable sort columns (xG/60, FF%, on-ice Sh%/Sv%) sort NULLs
  last. Goalie leaderboards for `goalieTime`, `goalsAgainst` and `xga` sort by
  that stat.
- Default season where none is passed: the season in progress (October on).
- Deserve-to-win runs a Monte Carlo seeded from the game ID, so a game always
  returns the same numbers. It runs 10,000 simulations once over the whole
  game and reads the result after each shot.
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
