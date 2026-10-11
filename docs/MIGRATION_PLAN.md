# Migration Plan: C# → TypeScript (TanStack Start on Vercel + Neon)

## Goals

- Remove all C#/.NET code. One TypeScript codebase.
- Keep **Neon Postgres** as the database (no data migration, no schema changes during the port).
- Host on **Vercel**. Ingestion runs on **Vercel Cron**.
- Cut Neon cost: no background polling, no duplicate syncs, no full-season re-upserts.
- Zero visible change for users: same URLs, same API responses, same UI.

## Why (findings from 2026-10-11)

- Nightly Hangfire sync has **failed every night since at least 2026-09-12**.
- 748 Hangfire server registrations → the Fly app (256 MB) is crash-looping from OOM.
- Hangfire continuously writes to Postgres (55k+ `lock` row inserts), keeping Neon compute awake.
- The sync is triggered **twice**: Hangfire's `RecurringJob` *and* `.github/workflows/scheduled-sync.yml` curling `/api/admin/sync`.
- Shots are re-downloaded and re-upserted for the **whole season** every night (`team_seasons` shows ~10 rewrites per row).
- DB size: 1.6 GB total, `shots` = 1.38 GB (1.1M rows). Everything else ≈ 220 MB.

## Target architecture

```
app/ (TanStack Start, deployed to Vercel)
├── src/routes/            # existing UI routes (moved from client/src/routes)
├── src/routes/api/        # server routes reproducing /api/* REST contract
├── src/server/db/         # Drizzle schema (pulled from Neon) + client
├── src/server/queries/    # ports of C# repositories
├── src/server/services/   # ports of Api/Endpoints/Helpers + DeserveToWinService
├── src/server/ingestion/  # downloaders, CSV parsers, importers, sync steps
└── scripts/               # backfill / seed CLI (run locally or in GH Actions)
```

Decisions:

- **Keep the REST contract.** Implement `/api/*` as TanStack Start server routes so `client/src/lib/api.ts` and all hooks work unchanged, and responses can be diffed against the C# API. Converting to server functions can happen later, optionally.
- **Start in SPA mode** (or SSR off for most routes) to minimize UI changes. SSR can be enabled per-route later.
- **Drizzle ORM** with `drizzle-kit pull` to introspect the live schema. Drizzle does **not** own migrations initially. The EF `__EFMigrationsHistory` table stays untouched until cutover.
- **DB driver:** `@neondatabase/serverless` (HTTP/WebSocket) via `drizzle-orm/neon-http` for request handlers. Use the **pooled** Neon connection string.
- **Caching:** replace ASP.NET OutputCache with `Cache-Control` headers (`s-maxage` + `stale-while-revalidate`) so Vercel's CDN absorbs repeat reads and Neon sleeps more. Map the existing policies:
  | C# policy | TTL | Header |
  |---|---|---|
  | StaticData | 24h | `public, s-maxage=86400, stale-while-revalidate=86400` |
  | SemiStaticData | 6h | `s-maxage=21600, swr=21600` |
  | TeamData | 30m | `s-maxage=1800, swr=3600` |
  | SearchResults | 5m | `s-maxage=300, swr=600` |
  | LiveData | 15s | `s-maxage=15, swr=30` |
- **Validation:** `zod` for query params (replaces minimal API binding and route constraints such as `{id:int}`).
- **CSV:** `csv-parse` (streaming) for MoneyPuck files. `fflate`/`unzipper` if any download is zipped.
- **Tests:** Vitest. Port the existing xUnit tests (few) and add parity tests.

## Phase 0: Preparation (on current production)

1. Stop the duplicate trigger: disable `.github/workflows/scheduled-sync.yml` **or** remove the Hangfire `RecurringJob` registrations (pick one, ideally the GH workflow, until cutover).
2. Record a baseline of Neon usage (compute hours/day, storage) from the Neon console for later comparison.
3. Snapshot API responses for parity testing: write `scripts/snapshot-api.ts` that hits every endpoint (list below) against `https://benchwarmer-api.fly.dev` with representative params and saves JSON to `parity/fixtures/`. **Note:** responses only match if data is unchanged, so take the snapshot and run parity checks against the same DB state. Pause ingestion during the parity window.

## Phase 1: Scaffold

1. Create the TanStack Start app. Preferred approach: convert `client/` in place (rename to `app/` or keep `client/`) rather than a new copy, so git history follows the files.
   - Replace `vite.config.ts` plugins with `tanstackStart()` (+ `react`, `tailwindcss`), keeping the `@` alias.
   - Move `main.tsx`/`App.tsx` bootstrapping into Start's `router.tsx` + `__root.tsx` conventions. Keep QueryClient provider and contexts.
   - Remove the dev proxy to `localhost:5000` and the `VITE_API_URL` default (API becomes same-origin `/api`).
   - Configure the Vercel target (Nitro `vercel` preset / per current TanStack Start docs).
2. Add Drizzle: `drizzle.config.ts`, run `drizzle-kit pull` against Neon, commit generated schema into `src/server/db/schema.ts`. Exclude the `hangfire` schema and `__EFMigrationsHistory`.
3. Add `src/server/db/client.ts` (neon-http driver). Env: `DATABASE_URL` (pooled).
4. Add `/api/health` server route that runs `select 1`.
5. Deploy a preview to Vercel and confirm UI loads (still calling the Fly API is fine at this point via an env override).
6. Update `CLAUDE.md`, root `package.json` scripts, `.env.example` (`DATABASE_URL`, `CRON_SECRET`).

**Exit criteria:** app builds, runs locally with `npm run dev`, preview deploy works, `/api/health` hits Neon.

## Phase 2: Port the read API

Port one group at a time, each in its own PR-sized commit. For each: port repository queries → helpers/mappers → route handler → parity check against fixtures.

Source files:
- Endpoints: `server/Benchwarmer.Api/Endpoints/*.cs`
- Helpers: `server/Benchwarmer.Api/Endpoints/Helpers/*.cs` (GameMappers, GamePreviewBuilder, GoalieWorkloadBuilder, LeaderboardBuilder, PlayerHelpers, ShotMappers, SpecialTeamsStatsMappers, StandingsMappers, StatsMappers, TeamMappers)
- Service: `server/Benchwarmer.Api/Services/DeserveToWinService.cs`
- Repositories: `server/Benchwarmer.Data/Repositories/*.cs` (raw SQL in `LineRepository`, `SkaterStatsRepository`)
- Constants: `server/Benchwarmer.Data/{NhlConstants,GameState,LeaderboardCategories}.cs`, `Constants/`
- DTOs: `server/Benchwarmer.Api/Dtos/`, compare against `client/src/types/` (reuse client types as the source of truth where they match)

Suggested order (simple → complex):

1. **Seasons** `/api/seasons`: `/`
2. **Teams** `/api/teams`: `/`, `/{abbrev}`, `/{abbrev}/roster`, `/{abbrev}/seasons`, `/{abbrev}/lines`, `/{abbrev}/chemistry-matrix`, `/{abbrev}/score-state-stats`, `/{abbrev}/special-teams`, `/{abbrev}/special-teams/players`, `/{abbrev}/special-teams/trend`
3. **Team shots** `/api/teams/{abbrev}/shots`: `/`, `/against`, `/shooters`
4. **Players** `/api/players`: `/` (search), `/{id}`, `/{id}/stats`, `/{id}/linemates`, `/{id}/shots`, `/{id}/rolling-stats`, `/{id}/workload`, `/compare`
5. **Standings** `/api/standings`: `/`, `/analytics`, `/power-rankings`, `/team-rankings` (verify exact mapping in `StandingsEndpoints.cs`)
6. **Special teams** `/api/special-teams`: 3 endpoints
7. **Stats** `/api/stats`: `/homepage`, `/leaderboards`, `/category-rankings`, `/player-leaders`, `/top-lines`, `/outliers`, `/rookies`, `/breakout-candidates`, `/age-curves`, `/age-distribution/{age}`, `/league-trends`, `/season-percentiles/{season}`, `/skater-league-baselines`, `/goalie-league-baselines`, `/penalty-stats`
8. **Games** `/api/games`: `/`, `/today`, `/yesterday`, `/live`, `/{gameId}`, `/{gameId}/boxscore`, `/{gameId}/preview`, `/{gameId}/shots`, `/{gameId}/goalie-form`, `/{gameId}/deserve-to-win`

> The list above was compiled from `MapGet` calls. Confirm each group/prefix pairing in the source before porting.

Porting notes:
- EF Core LINQ → Drizzle query builder. For heavy aggregations, prefer `sql` templates copied from the generated EF SQL (enable EF logging locally if needed) to guarantee identical results.
- Watch for **numeric semantics**: C# `decimal`/`double` rounding, integer division, `Math.Round` (banker's rounding by default!) vs JS `Math.round`. Write a shared `roundHalfEven` helper if C# code uses default `Math.Round`.
- Watch for **JSON casing and nulls**: ASP.NET emits camelCase and includes nulls. Match exactly.
- Watch for **date handling**: `DateOnly`/`DateTime` serialization formats and timezone (UTC) assumptions.
- Postgres `numeric` comes back as string from the driver. Convert explicitly where C# used `decimal`.
- The C# app used `DbContextFactory` for **parallel queries** in some handlers. Use `Promise.all` but keep concurrency modest (Neon pooler).
- Set `Cache-Control` per the policy table on every route, matching the C# `CacheOutput(...)` attribute for that endpoint.
- Error shape: match C# `Results.NotFound()`/`BadRequest` status codes.

Parity tooling:
- `scripts/parity.ts`: for each fixture, call the new local/preview endpoint, deep-diff JSON (ignore key order, tolerate float diffs < 1e-9), print a report. Run it after each group.

**Exit criteria:** all GET endpoints pass parity. Client points at the same-origin API.

## Phase 3: Port ingestion (incremental, Vercel Cron)

Source: `server/Benchwarmer.Ingestion/` (Jobs, Importers, Parsers, Services) + `TeamAbbreviationNormalizer.cs`.

1. Port parsers (`CsvParser`, `*Record`) as typed row mappers over `csv-parse` streams. Keep column name mapping identical (`ShotRecord` has ~125 columns).
2. Port `MoneyPuckDownloader` and `NhlScheduleService` using `fetch` (streaming bodies).
3. Port importers with batched `INSERT ... ON CONFLICT DO UPDATE` (chunks of ~1000 rows). **Only update rows whose values changed:** add `WHERE (excluded.*) IS DISTINCT FROM (table.*)` on the relevant columns to avoid needless writes.
4. **Incremental shots:** before importing, query existing `game_id`s for the season. Only insert shots for games not yet present (plus games from the last N days to catch MoneyPuck corrections). This drops nightly writes from the full season to a few thousand rows.
5. Port `ScoreStateTimeCalculator` (scope to games changed in this run if possible) and the materialized view refreshes (`REFRESH MATERIALIZED VIEW CONCURRENTLY chemistry_pairs` / `season_percentiles`, matching existing names).
6. Split the nightly job into independent cron routes, each well under the Vercel duration limit and each idempotent:
   | Route | Work |
   |---|---|
   | `/api/cron/schedule` | NHL schedule / games sync |
   | `/api/cron/season-stats` | teams, skaters, goalies, lines (regular + playoffs) |
   | `/api/cron/shots` | incremental shots |
   | `/api/cron/derived` | score-state times + materialized view refresh |
   | `/api/cron/bios` | weekly player bio sync (`WeeklyBioSyncJob`) |
   Stagger them in `vercel.json` `crons` (e.g. 09:00, 09:15, 09:30, 09:45 UTC; bios Sundays 10:00 UTC). Set `maxDuration` per route.
7. Auth: each cron route requires `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically).
8. Add a lightweight `sync_runs` log (step, started_at, finished_at, status, rows, error), or reuse an existing ingestion log table if one exists, so failures are visible. Vercel logs are short-lived.
9. **Backfill/seed CLI** (`scripts/seed.ts`, port of `InitialSeedJob`): runs locally or via a `workflow_dispatch` GitHub Action. No duration limits. Supports `--season`, `--dataset`.
10. Verify against a Neon **branch** (copy-on-write, cheap): run every cron step against the branch, compare row counts and spot-check values vs main.

> Check current Vercel plan limits (function max duration, cron frequency, Hobby = non-commercial) before finalizing schedules.

**Exit criteria:** all cron steps succeed on a Neon branch within time limits. A second run produces ~0 writes.

## Phase 4: Cutover

1. Set Vercel env vars: `DATABASE_URL` (pooled), `CRON_SECRET`.
2. Point the production domain to Vercel (replaces Azure Static Web App + Fly API).
3. Stop the Fly app (`fly scale count 0`), and leave it for a few days as a rollback option.
4. Disable `.github/workflows/scheduled-sync.yml`.
5. Monitor for 3 to 5 nights: cron success, Neon compute hours vs the Phase 0 baseline, error logs.

## Phase 5: Cleanup

1. Drop the Hangfire schema: `DROP SCHEMA hangfire CASCADE;`
2. Delete `server/`, `server/fly.toml`, `infra/` (Azure bicep), C# parts of `docker-compose.yml`/`docker/`, `deploy.yml` steps for .NET/Fly/SWA. Update `ci.yml` to lint/typecheck/test the TS app.
3. Decide on migrations ownership: adopt `drizzle-kit` migrations from the pulled baseline, and drop `__EFMigrationsHistory`.
4. Update `CLAUDE.md`, `README.md`, `docs/PRD.md`, `docs/TODO.md` for the new stack.
5. Destroy the Fly app and remove secrets (`FLY_API_TOKEN`, `SWA_DEPLOYMENT_TOKEN`, `API_KEY`). Rotate/retire `ADMIN_API_KEY`.

## Later / optional

- Shrink `shots` (1.38 GB): audit which of the ~125 columns the UI uses and drop or archive the rest. This could fit Neon's cheaper tiers.
- Convert REST calls to TanStack Start server functions + route loaders, and enable SSR for SEO on player/team pages.
- Re-evaluate the DB host once storage is reduced.

## Risks

| Risk | Mitigation |
|---|---|
| Subtle stat differences after port | Fixture parity diffs per endpoint, `roundHalfEven`, copy EF-generated SQL for heavy queries |
| Cron step exceeds duration limit | Incremental shots, split steps, per-step `maxDuration`, backfill CLI for heavy work |
| Neon connection limits from serverless | Pooled connection string, neon-http driver, modest `Promise.all` fan-out |
| Neon kept awake by traffic | CDN `s-maxage`/`swr` caching on all GET routes |
| Rollback | Fly app scaled to 0 but intact until Phase 5 |
