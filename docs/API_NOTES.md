# API notes

TypeScript port of `server/Benchwarmer.Api` (handlers in `app/src/server/api/`,
thin route files in `app/src/routes/api/`). Response shapes match the C#
DTOs as serialized by System.Text.Json (camelCase, nulls included), which is
what `app/src/types/` describes.

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
| `nhl-client.ts` | request-time NHL API reads (10 s timeout; failures degrade to empty results, as in the C#) |
| `handler.ts`, `query.ts`, `errors.ts`, `format.ts`, `constants.ts` | shared plumbing |

`apiHandler(tier, fn)` parses the query string with ASP.NET binding rules
(case-insensitive names; unparseable numbers/booleans and missing required
parameters are a 400), turns thrown `HttpError`s into `{ error, code }`
responses, and sets the cache header.

## Caching

The C# output-cache policies became CDN headers
(`Cache-Control: public, max-age=0, s-maxage=N, stale-while-revalidate=N`):

| Tier | N | Used by |
|---|---|---|
| `static` | 24 h | teams list/detail, game shots |
| `semiStatic` | 6 h | seasons, games by date, yesterday, boxscore, deserve-to-win |
| `team` | 30 min | most team/player/stats/standings endpoints |
| `search` | 5 min | player search |
| `live` | 15 s | today, live, game detail |

Errors are `no-store`. The CDN keys on the full URL, so the C# vary-by-query
lists aren't needed. `/api/games/{id}` had no cache policy in the C#; it uses
the live tier.

## Numbers

- Arithmetic uses JS doubles where the C# used `decimal`. Rounded outputs
  use `round()` (banker's rounding on the value's shortest decimal form, like
  `Math.Round(decimal)`), so they match. Unrounded ratios (PDO, percentages
  the UI formats itself) can differ in the last few digits.
- Raw SQL returns `numeric` as strings; handlers convert with `Number()`.
  Drizzle-typed columns are already numbers (`mode: "number"`).

## Differences from the C# API

Fixes:

- `shotId` in shot responses is `{gameId}-{eventId}`. MoneyPuck's `shotID`
  isn't unique (see `SCHEMA_NOTES.md`), and the UI uses it as a React key.
- Team/player shots: `goalsOnly` is applied before `limit` (C# took `limit`
  shots, then dropped non-goals).
- Leaderboards: nullable sort columns (xG/60, FF%, on-ice Sh%/Sv%) sort NULLs
  last. The C# sorted DESC in SQL, which put NULL rows at the top.
- Goalie leaderboards for `goalieTime`, `goalsAgainst` and `xga` sort by that
  stat. The C# fell back to sorting by save % while showing the other value.
- Default season where none is passed: the season in progress (October on).
  Several C# endpoints used `DateTime.Now.Year`, which pointed at a season
  that doesn't exist yet from January to September.
- Deserve-to-win Monte Carlo is seeded from the game ID, so a game always
  returns the same numbers (the C# result changed on every request). It runs
  10,000 simulations once over the whole game and reads the result after
  each shot, instead of re-simulating every shot prefix; each prefix's
  estimate has the same distribution.
- GET handlers don't write to the DB. The C# upserted games it fetched from
  the NHL schedule while serving `/games` pages; the schedule cron now stores
  yesterday through the next 7 days instead (game preview and goalie form
  look games up by ID).
- The `scoreState` validation error is `{ error, code }` like the others (the
  C# had the two fields swapped).
- 404s from `/api/games/*` have a JSON body (`GAME_NOT_FOUND`); ASP.NET's
  `Results.NotFound()` had none. Non-integer `{id}`/`{age}`/`{season}` route
  values are a JSON 404 too (no C# route matched).

Kept as-is on purpose:

- Power rankings, standings analytics and category rankings estimate a
  record from goals (Pythagorean wins, 10% of losses as OTL) and special
  teams from ice time (one opportunity per 2 minutes).
- Official standings, records/streaks shown on game cards, and category
  rankings' points always come from the NHL's current standings, even for
  past seasons (the NHL API's historical standings were unreliable).
- Penalty-kill `savePct` in `/api/teams/{abbrev}/special-teams` is a 0-1
  fraction rounded to 1 dp (so usually 0.8 or 0.9).
- Goalie recent form counts every dressed goalie with a `saves/shots` line
  in the boxscore, including backups who didn't play (`0/0`).
- Boxscore responses use the 6 h tier, as the C# did, so a live game's
  boxscore can be stale.
- `/api/stats/homepage` (not used by the UI) is ported for completeness.
