# Schema notes

The Drizzle schema is `app/src/server/db/schema.ts`; migrations are in
`app/drizzle/` (`0000_init.sql` is the baseline, including the materialized
views).

## Conventions

- 28 tables plus `sync_runs`. Table and column names are snake_case and keep
  some odd spellings (`went_to_o_t`, `i_f_x_freeze`, `on_ice_a_x_goals`) that
  queries and raw SQL reference directly. Renaming them is an ordinary
  migration if ever wanted.
- TS property keys are camelCase with acronyms lowered as a run, e.g.
  `ifxFreeze`, `xGoalsFor`, matching the JSON the API returns.
- Primary keys are `id`. Foreign keys cascade on delete, except
  `line_combinations.player3_id` (NO ACTION).
- `players.id` is a plain primary key holding the MoneyPuck/NHL player ID,
  always supplied explicitly.
- Index names are lowercase `ix_<table>_<cols>`, with `ix_<table>_unique` when
  that would exceed 63 characters. PK/FK/unique constraints use Drizzle/Postgres
  default names.
- `created_at`/`updated_at`/`calculated_at` default `now()`, and
  `teams.is_active` defaults `true`, so bulk inserts can omit them. `upsert()`
  sets `updated_at` when a row changes.

## Keys and indexes

| Decision | Why |
|---|---|
| `line_combinations` unique key is a `UNIQUE NULLS NOT DISTINCT` constraint | `player3_id` is NULL for defense pairs. With default NULL semantics, `ON CONFLICT` upserts never match D-pairs and insert duplicates. |
| `shots` unique key is `(game_id, event_id)` (migrations `0001`-`0002`) | MoneyPuck `shotID` is not a usable key: 2008-2017 are numbered continuously, every season since 2018 restarts at 0, in-progress season files restart it mid-file (renumbered later), and the 2008 file repeats events under new shotIDs. The NHL event within its game is unique and stable (`game_id` encodes the season). `shot_id` is kept as data but isn't unique. |
| `teams.abbreviation` has one unique constraint | It also serves as the FK target for `team_seasons` and `team_games`. |
| `team_games` shares its stat columns with `team_seasons` (`teamStatColumns()`, migration `0003`) | Same MoneyPuck fields, per game instead of per season (no `games_played`). Unique key is `(game_id, team_abbreviation, situation)`; the "other" situation isn't stored. `opponent_abbreviation` has no FK. |
| No standalone indexes on `shots(season)`, `shots(game_id)`, `shots(shooter_player_id)`, `shots(goalie_player_id)`, `line_combinations(season, team)`, `games(game_date)` | Each is a leading-column prefix of another index on the same table, so it would add storage and write cost (notably on `shots`, the largest table) without serving any extra query. |
| `skater_games` (migration `0004`) | One row per skater per final game; unique `(game_id, player_id)`. `player_id` has no FK (call-ups can play before their bio is imported), so `name` and `position` are stored from the box score. |
| `playoff_odds`, `playoff_odds_games` (migration `0005`) | One row per team (or game) per daily run; earlier runs are kept for day-over-day changes. `playoff_odds` also stores the run's team ratings, which pregame odds read (`rating_roster`, `rating_goalie` from migration `0010`). |
| `projection_inputs` (migration `0012`) | What the playoff odds sandbox simulates from: the latest run's `SandboxInputs` as jsonb, one row per season (older runs are deleted). `playoff_odds_experimental` (`0010`) held an experimental injury model's odds until `0011` dropped it; that model is now a sandbox option. |
| NHL records tables (migration `0006`) | `franchises` (records site IDs), `franchise_seasons` (unique `(franchise_id, season)`, regular seasons only, with the playoff result), `franchise_head_to_head` (unique `(franchise_id, opponent_franchise_id, is_playoffs)`, one row per side), `draft_picks` (records pick ID; `franchise_id` and `player_id` have no FK because old picks and never-signed players have no match) and `player_careers` (NHL player ID, regular-season totals in every era). Refreshed weekly by `/api/cron/history`. |
| `trophies`, `award_winners` (migration `0007`) | Records site IDs. `trophies.slug` is the NHL's URL slug (unique; "king-clancey" is their spelling). `award_winners` holds winners, runners-up and finalists (`status`); `player_id` and `team_id` are nullable (coaches, executives, teams) and, like `franchise_id`, have no FK. Loaded by the `nhl_records` step. |
| Records extras (migration `0008`) | `franchise_people` (captains, coaches, GMs, retired numbers parsed from the records site's HTML lists; rows no longer in the import are deleted), `hall_of_fame` (Hockey Hall of Fame inductees with an NHL player ID; the US and IIHF halls are left out), `milestone_moments` (id `<kind>-<gameId>-<playerId>`), `officials`, `coaches`, `league_attendance`, `draft_lotteries` (plain text plus the odds image URL). `player_careers` gains goalie playoff columns (Game 7 and overtime). |
| ESPN tables (migration `0009`) | `espn_players` (ESPN athlete ID → our player ID, with how it matched; `player_id` null for prospects with no NHL games, retried each run), `player_injuries` (injury stints: one row per spell on ESPN's list, open while `resolved_at` is null; a partial unique index allows one open stint per athlete; ESPN's injury IDs aren't unique, so stints key on the athlete), `transactions` (unique `(transaction_date, team, description)`: ESPN gives no IDs; `kind` and `player_id` are parsed from the text) and `game_odds` (unique `(game_id, provider_id)`, moneylines per sportsbook for model benchmarking only, never served by the API). No foreign keys: ESPN rows can name players and games before we have them. |
| `sync_runs` table | Ingestion visibility and resumable backfill (step, season, started_at, finished_at, status, rows_written, error). `status` is checked to `running`/`succeeded`/`failed`. |

## Type mapping in TypeScript

- `numeric` columns use `{ mode: "number" }`, so values arrive as JS numbers
  rather than strings. The DB still stores exact `numeric`. Any value that
  needs more than ~15 significant digits would lose precision in JS (none of
  the MoneyPuck stats do).
- `bigint` columns (`shots.id`, `chemistry_pairs.total_ice_time_seconds`) use
  `{ mode: "number" }`; values stay far below 2^53.
- `date` columns are strings (`YYYY-MM-DD`), avoiding timezone shifts.
- `timestamp with time zone` columns are JS `Date`s.

## Considered, not changed

- `players(name)` btree index: kept. It serves `ORDER BY name`, but not the
  search itself (`strpos(lower(name), q)` on name/first/last). A `pg_trgm`
  index could speed up search later if needed.
- Drizzle `relations()`: not added. Add them if the relational query API
  turns out useful.

## Materialized views

Declared with `.existing()` in `schema.ts`, so they are typed for queries but
`drizzle-kit` never generates or drops them. Their DDL is custom SQL appended
to `0000_init.sql`. They are created populated (instant on empty tables)
because `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a populated view and
a unique index. Any future change to a view needs a hand-written migration.
