# Migration Plan: C# → TypeScript (TanStack Start on Vercel + Neon)

## Goals

- **Wholesale replacement.** The C# app is not run again, for any reason. It serves only as **reference source code** for the logic being ported. It currently doesn't work in production.
- One TypeScript codebase: **TanStack Start** on **Vercel**, **Drizzle** on a **brand-new Neon project**, ingestion via **Vercel Cron**.
- Net-new database: never read from or migrate the old DB. Data comes from a fresh TS backfill.
- Keep the user-facing app the same: same URLs, same `/api/*` contract the client expects (as defined by `client/src/types` + `client/src/lib/api.ts`), same UI.
- Cheap to run: no background polling, no full-season re-upserts, CDN caching so Neon can scale to zero.

## Context (2026-10-11)

- The production C# app on Fly (256 MB) crash-loops from OOM. The nightly Hangfire sync has failed every night since at least 2026-09-12.
- Hangfire's constant DB writes kept Neon awake. The sync was also triggered twice (Hangfire recurring job + GH Actions curl), and re-upserted every shot for the whole season each night.
- Old DB size for reference: ~1.6 GB, of which `shots` = 1.38 GB (~1.1M rows, 2008 → present).

## Target architecture

```
client/ (converted in place to TanStack Start; rename to app/ optional)
├── src/routes/            # existing UI routes
├── src/routes/api/        # server routes implementing /api/*
├── src/server/db/         # Drizzle schema + client
├── src/server/queries/    # ports of C# repositories
├── src/server/services/   # ports of Api/Endpoints/Helpers + DeserveToWinService
├── src/server/ingestion/  # downloaders, CSV parsers, importers, sync steps
├── drizzle/               # migrations, starting with a single 0000_init.sql
└── scripts/               # backfill CLI
```

Decisions:

- **Keep the REST contract.** `/api/*` implemented as TanStack Start server routes, so `client/src/lib/api.ts` and the hooks stay unchanged. The client's TS types are the source of truth for response shapes.
- **SPA mode first** (SSR off) to minimize UI changes. SSR per-route later, optionally.
- **Drizzle owns the schema** from day one, as one baseline migration.
- **DB driver:** `@neondatabase/serverless` via `drizzle-orm/neon-http` in request handlers, using the pooled connection string. The backfill CLI can use a direct connection (`postgres`/`pg`) for bulk speed.
- **Caching:** `Cache-Control` with `s-maxage` + `stale-while-revalidate` per route, so Vercel's CDN absorbs repeat reads. Reuse the C# tiers:
  | Tier | Header |
  |---|---|
  | Static (24h) | `public, s-maxage=86400, stale-while-revalidate=86400` |
  | Semi-static (6h) | `public, s-maxage=21600, stale-while-revalidate=21600` |
  | Team data (30m) | `public, s-maxage=1800, stale-while-revalidate=3600` |
  | Search (5m) | `public, s-maxage=300, stale-while-revalidate=600` |
  | Live (15s) | `public, s-maxage=15, stale-while-revalidate=30` |
  Look up each endpoint's tier from its `CacheOutput(...)` in the C# source.
- **Validation:** `zod` for query/path params.
- **CSV:** `csv-parse` (streaming).
- **Tests:** Vitest.

## Phase 1: Scaffold + schema

1. Convert `client/` in place to TanStack Start (keep git history):
   - `vite.config.ts`: `tanstackStart()` + react + tailwind, keep the `@` alias, drop the `/api` dev proxy to `localhost:5000`.
   - Move bootstrapping (`main.tsx`/`App.tsx`) into Start's `router.tsx`/`__root.tsx` conventions. Keep QueryClient + contexts.
   - API base URL becomes same-origin `/api` (drop the `VITE_API_URL` default).
   - Configure the Vercel deployment target per current TanStack Start docs.
2. Design the Drizzle schema in `src/server/db/schema.ts`, **using the C# EF model as the reference** (`server/Benchwarmer.Data/Entities/*`, `AppDbContext.cs`, and the latest `AppDbContextModelSnapshot.cs` for exact column types, keys, and indexes). Read the source directly; no need to run `dotnet`.
   - Keep table and column names close to the existing ones (snake_case), so ported queries and raw SQL in `LineRepository`/`SkaterStatsRepository` translate directly. Improvements are allowed where clearly beneficial; note each one.
   - Port both materialized views (`chemistry_pairs`, `season_percentiles`) and their unique indexes (required for `REFRESH ... CONCURRENTLY`) from the EF migrations `AddChemistryPairsMaterializedView`, `AddPositionsToChemistryPairs`, `AddSeasonPercentilesMaterializedView` as custom SQL.
   - Add a `sync_runs` table (step, season, started_at, finished_at, status, rows_written, error) for ingestion visibility.
   - No Hangfire tables and no `__EFMigrationsHistory`.
3. `drizzle-kit generate` → a single `drizzle/0000_init.sql` (with the custom view SQL appended). Verify it applies cleanly to a throwaway local Postgres 17 (`docker compose`).
4. `src/server/db/client.ts` (neon-http, `DATABASE_URL`). `/api/health` runs `select 1`.
5. Update `CLAUDE.md`, `package.json` scripts (`db:generate`, `db:migrate`, `backfill`), `.env.example` (`DATABASE_URL`, `DATABASE_URL_DIRECT`, `CRON_SECRET`).

**Exit criteria:** app builds and runs locally, `0000_init.sql` applies to a fresh local Postgres, `/api/health` works against it.

## Phase 2: New Neon project + ingestion + backfill

Ingestion comes **before** the API, because there's no data until the TS backfill runs.

**(User)** Create a Neon project on **AWS `us-east-1`** (near Vercel `iad1`), Postgres 17, scale-to-zero, 0.25 CU minimum. Provide pooled + direct connection strings. Apply `0000_init.sql` with `drizzle-kit migrate`.

Reference source: `server/Benchwarmer.Ingestion/` (Jobs, Importers, Parsers, Services) + `TeamAbbreviationNormalizer.cs`.

1. **Parsers:** typed row mappers over `csv-parse` streams. Match the MoneyPuck column mappings in the `*Record.cs` files (`ShotRecord` is ~125 columns).
2. **Downloaders:** port `MoneyPuckDownloader` and `NhlScheduleService` with `fetch` + streaming. Be polite to MoneyPuck: sequential downloads, retry with backoff.
3. **Importers:** batched `INSERT ... ON CONFLICT DO UPDATE` (~1000 rows/batch), with `WHERE ... IS DISTINCT FROM ...` so unchanged rows aren't rewritten. Port any normalization logic exactly (team abbreviations, game ID conversion in `ShotImporter`, etc.).
4. **Shots:** incremental by default. Only insert shots for games not already present, plus games from the last N days to catch MoneyPuck corrections.
5. **Derived data:** port `ScoreStateTimeCalculator` and materialized view refreshes (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).
6. **Backfill CLI** (`scripts/backfill.ts`, port of `InitialSeedJob`, which goes 2008 → current). Options: `--from-season`, `--to-season`, `--dataset`. Resumable: records progress in `sync_runs`, and skips completed season/dataset pairs unless `--force`. Runs locally against the direct connection, with no time limits.
   - Unlike the C# seed, the backfill **also syncs the NHL schedule/games and computes score-state times** for every season it loads, so historical seasons are complete.
7. **Cron routes**, each idempotent and well under Vercel's function duration limit:
   | Route | Work | Schedule (UTC) |
   |---|---|---|
   | `/api/cron/schedule` | NHL schedule/games sync | 09:00 daily |
   | `/api/cron/season-stats` | teams, skaters, goalies, lines (reg + playoffs) | 09:15 daily |
   | `/api/cron/shots` | incremental shots | 09:30 daily |
   | `/api/cron/derived` | score-state + view refresh | 09:45 daily |
   | `/api/cron/bios` | player bios (`WeeklyBioSyncJob`) | Sun 10:00 |
   Protected by `Authorization: Bearer ${CRON_SECRET}`. `maxDuration` set per route. Check current Vercel plan limits (duration, cron frequency, Hobby = non-commercial) before finalizing.
8. **Verify data** (no C# baseline exists):
   - Row counts per season/dataset equal the source CSV row counts (minus intentional filters).
   - Spot-check a handful of players/teams/games against MoneyPuck and NHL.com.
   - Re-running a cron step immediately writes ~0 rows.
   - Unit tests for parsers and normalizers using small CSV fixtures.

**Exit criteria:** full backfill completed on the new Neon DB, all cron steps succeed locally against it within time limits, and data spot-checks pass.

## Phase 3: Port the read API

Port one group at a time (one commit each): queries → helpers/mappers → route → tests → check the corresponding UI pages locally.

Reference source:
- Endpoints: `server/Benchwarmer.Api/Endpoints/*.cs`
- Helpers: `server/Benchwarmer.Api/Endpoints/Helpers/*.cs` (GameMappers, GamePreviewBuilder, GoalieWorkloadBuilder, LeaderboardBuilder, PlayerHelpers, ShotMappers, SpecialTeamsStatsMappers, StandingsMappers, StatsMappers, TeamMappers)
- Service: `server/Benchwarmer.Api/Services/DeserveToWinService.cs`
- Repositories: `server/Benchwarmer.Data/Repositories/*.cs`
- Constants: `server/Benchwarmer.Data/{NhlConstants,GameState,LeaderboardCategories}.cs`, `Constants/`
- Response shapes: `client/src/types/` (source of truth), cross-checked with `server/Benchwarmer.Api/Dtos/`

Order (simple → complex):

1. **Seasons** `/api/seasons`: `/`
2. **Teams** `/api/teams`: `/`, `/{abbrev}`, `/{abbrev}/roster`, `/{abbrev}/seasons`, `/{abbrev}/lines`, `/{abbrev}/chemistry-matrix`, `/{abbrev}/score-state-stats`, `/{abbrev}/special-teams`, `/{abbrev}/special-teams/players`, `/{abbrev}/special-teams/trend`
3. **Team shots** `/api/teams/{abbrev}/shots`: `/`, `/against`, `/shooters`
4. **Players** `/api/players`: `/` (search), `/{id}`, `/{id}/stats`, `/{id}/linemates`, `/{id}/shots`, `/{id}/rolling-stats`, `/{id}/workload`, `/compare`
5. **Standings** `/api/standings`
6. **Special teams** `/api/special-teams`
7. **Stats** `/api/stats`: `/homepage`, `/leaderboards`, `/category-rankings`, `/player-leaders`, `/top-lines`, `/outliers`, `/rookies`, `/breakout-candidates`, `/age-curves`, `/age-distribution/{age}`, `/league-trends`, `/season-percentiles/{season}`, `/skater-league-baselines`, `/goalie-league-baselines`, `/penalty-stats`
8. **Games** `/api/games`: `/`, `/today`, `/yesterday`, `/live`, `/{gameId}`, `/{gameId}/boxscore`, `/{gameId}/preview`, `/{gameId}/shots`, `/{gameId}/goalie-form`, `/{gameId}/deserve-to-win`

> Compiled from `MapGet` calls. Confirm group/prefix pairings in the source.

Porting notes:
- **Rounding:** C# `Math.Round` defaults to banker's rounding. Use a shared `roundHalfEven` helper wherever the C# used it.
- Integer division in C# (`int / int`) truncates. Replicate it where intended.
- JSON: camelCase, and nulls included where the client types expect them.
- Dates: match `DateOnly`/`DateTime` formats and UTC assumptions the client relies on.
- Postgres `numeric` arrives as a string from the driver. Convert explicitly.
- Parallel queries: `Promise.all`, with modest fan-out.
- Every GET route sets its cache tier header.
- Status codes: 404/400 where the C# returned `NotFound`/`BadRequest`.
- Unit tests (Vitest) for non-trivial calculations: deserve-to-win, percentiles, leaderboards, rolling stats, goalie workload, power rankings. Derive expected values by reading the C# logic.

**Exit criteria:** every endpoint used by `client/src/hooks` is implemented, and every page renders correctly locally against the new DB.

## Phase 4: Deploy + cutover

1. **(User approval)** Create the Vercel project and set env vars: `DATABASE_URL` (pooled), `CRON_SECRET`. Deploy a preview and smoke-test every page.
2. Point the production domain at Vercel (replacing Azure Static Web App + Fly).
3. Enable crons. Watch 3 to 5 nightly runs via `sync_runs` and Vercel logs. Watch Neon compute hours.

## Phase 5: Cleanup

1. Delete `server/`, `infra/` (Azure bicep), the .NET/Fly/SWA parts of `docker-compose.yml`, `docker/`, `.github/workflows/deploy.yml` and `scheduled-sync.yml`. Make `ci.yml` lint/typecheck/test/build the TS app.
2. Update `CLAUDE.md`, `README.md`, `docs/PRD.md`, `docs/TODO.md`.
3. **(User)** Destroy the Fly app, the Azure Static Web App, and the old Neon project. Remove stale secrets (`FLY_API_TOKEN`, `SWA_DEPLOYMENT_TOKEN`, `API_KEY`, `NEON_CONNECTION_STRING`).

## Later / optional

- Shrink `shots` by dropping columns the UI never uses. This could fit a cheaper Neon tier.
- Move to server functions + loaders, and SSR for player/team pages (SEO).

## Risks

| Risk | Mitigation |
|---|---|
| Ported logic subtly differs from C# | Read C# carefully, unit tests for calculations, rounding helper, spot-check against MoneyPuck/NHL.com |
| No working baseline to compare against | Client types define shapes. External sources (MoneyPuck, NHL.com) validate values. |
| Backfill is long or interrupted | Resumable per season/dataset via `sync_runs` |
| Cron step exceeds duration limit | Incremental shots, split steps, per-route `maxDuration` |
| Serverless connection limits | Neon pooled connection + neon-http driver |
| Neon kept awake | CDN caching on all GET routes, no polling |
