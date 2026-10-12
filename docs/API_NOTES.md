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
| `nhl-client.ts` | request-time NHL API reads (10 s timeout; failures degrade to empty results) |
| `handler.ts`, `query.ts`, `errors.ts`, `format.ts`, `constants.ts` | shared plumbing |

`apiHandler(tier, fn)` parses the query string (case-insensitive names;
unparseable numbers/booleans and missing required parameters are a 400 with
code `INVALID_PARAMETER`), turns thrown `HttpError`s into `{ error, code }`
responses, and sets the cache header.

## Caching

Each GET route sets a CDN cache tier
(`Cache-Control: public, max-age=0, s-maxage=N, stale-while-revalidate=N`):

| Tier | N | Used by |
|---|---|---|
| `static` | 24 h | teams list/detail, game shots |
| `semiStatic` | 6 h | seasons, games by date, yesterday, boxscore, deserve-to-win |
| `team` | 30 min | most team/player/stats/standings endpoints |
| `search` | 5 min | player search |
| `live` | 15 s | today, live, game detail |

Errors are `no-store`. The CDN keys on the full URL.

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
- Boxscore responses use the 6 h tier, so a live game's boxscore can be
  stale.
- `/api/stats/homepage` isn't used by the UI.
