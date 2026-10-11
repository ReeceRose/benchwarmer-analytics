# Schema notes

The Drizzle schema (`client/src/server/db/schema.ts`) and baseline migration
(`client/drizzle/0000_init.sql`) were derived by reading the C# EF Core model:
`server/Benchwarmer.Data/Entities/*`, `AppDbContext.cs`, the latest
`Migrations/AppDbContextModelSnapshot.cs`, and the three materialized-view
migrations. No C# code was run and no existing database was read.

## What is identical to the EF model

- All 10 tables and all 520 columns: same table names, same column names
  (including EF's snake_case quirks such as `went_to_o_t`, `i_f_x_freeze`,
  `on_ice_a_x_goals`), same Postgres types, same nullability.
  Verified by diffing `pg_attribute` on a fresh Postgres 18 against the
  parsed snapshot.
- Primary keys (`id`), foreign keys and their delete rules (cascade where EF
  had a required relationship; `line_combinations.player3_id` is NO ACTION).
- Unique natural keys used for upserts.
- `chemistry_pairs` and `season_percentiles` view SQL and indexes, copied
  verbatim from `AddPositionsToChemistryPairs` and
  `AddSeasonPercentilesMaterializedView`.

TS property keys follow System.Text.Json's camelCase algorithm (the casing the
C# API emitted), e.g. `IFXFreeze` → `ifxFreeze`, `XGoalsFor` → `xGoalsFor`.

## Deliberate differences

| Change | Why |
|---|---|
| `line_combinations` unique key is a `UNIQUE NULLS NOT DISTINCT` constraint | `player3_id` is NULL for defense pairs. With default NULL semantics, `ON CONFLICT` upserts never match D-pairs and insert duplicates. The C# importer avoided this with in-memory dedup; the TS importers will use `ON CONFLICT`. |
| `players.id` is a plain primary key (EF: identity) | It holds the MoneyPuck/NHL player ID and is always supplied explicitly. |
| `teams.abbreviation`: one unique constraint (EF: unique index **and** alternate key) | The two were redundant; the constraint also serves as the FK target for `team_seasons`. |
| Dropped indexes `shots(season)`, `shots(shooter_player_id)`, `shots(goalie_player_id)`, `line_combinations(season, team)`, `games(game_date)` | Each is a leading-column prefix of another index on the same table, so it adds storage and write cost (notably on `shots`, the largest table) without serving any extra query. |
| Index names are lowercase `ix_<table>_<cols>` (EF: `IX_...`), with `ix_<table>_unique` when that would exceed 63 chars | Avoids quoted mixed-case identifiers; matches the existing `ix_chemistry_pairs_*` style. EF silently truncated one name (`..._is_p~`). PK/FK/unique constraints use Drizzle/Postgres default names. |
| `created_at`/`updated_at`/`calculated_at` default `now()`; `teams.is_active` defaults `true` | EF set these in C#. DB defaults make bulk inserts simpler. Importers should still set `updated_at` on update. |
| New `sync_runs` table | Ingestion visibility and resumable backfill (step, season, started_at, finished_at, status, rows_written, error). `status` is checked to `running`/`succeeded`/`failed`. |
| No `__EFMigrationsHistory`, no Hangfire schema | Drizzle owns migrations; Hangfire is gone. |

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

- Renaming the awkward EF column names. Repository raw SQL references them
  directly, so renames would add porting risk for no functional gain. Can be
  done later with ordinary migrations.
- `players(name)` btree index: kept. It serves `ORDER BY name`, but not the
  search itself (`lower(name) LIKE '%q%'` on name/first/last). A `pg_trgm`
  index could speed up search later if needed.
- Drizzle `relations()`: not added yet. Add them in Phase 3 if the relational
  query API turns out useful.

## Materialized views

Declared with `.existing()` in `schema.ts`, so they are typed for queries but
`drizzle-kit` never generates or drops them. Their DDL is custom SQL appended
to `0000_init.sql`. They are created populated (instant on empty tables)
because `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a populated view and
a unique index. Any future change to a view needs a hand-written migration.
