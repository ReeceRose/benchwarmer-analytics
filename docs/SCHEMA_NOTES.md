# Schema notes

The Drizzle schema is `app/src/server/db/schema.ts`; migrations are in
`app/drizzle/` (`0000_init.sql` is the baseline, including the materialized
views).

## Conventions

- 10 tables plus `sync_runs`. Table and column names are snake_case and keep
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
| `teams.abbreviation` has one unique constraint | It also serves as the FK target for `team_seasons`. |
| No standalone indexes on `shots(season)`, `shots(game_id)`, `shots(shooter_player_id)`, `shots(goalie_player_id)`, `line_combinations(season, team)`, `games(game_date)` | Each is a leading-column prefix of another index on the same table, so it would add storage and write cost (notably on `shots`, the largest table) without serving any extra query. |
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
