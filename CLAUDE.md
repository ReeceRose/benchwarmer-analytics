# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Benchwarmer Analytics is a hockey analytics platform for exploring NHL data, line combinations, and player performance. It ingests data from MoneyPuck and the NHL API and presents it through a web interface with visualizations.

**Status:** Mid-migration from C#/.NET to a single TypeScript app. See `docs/MIGRATION_PLAN.md` for phases and progress. The C# code in `server/` is **reference source only**: do not build, run, or migrate with it (no `dotnet` commands). It is deleted in Phase 5.

## Tech Stack

- **App:** TanStack Start (React 19, TypeScript, Vite), TanStack Router/Query, shadcn/ui, Tailwind CSS
- **Server:** TanStack Start server routes under `/api/*`, deployed to Vercel via Nitro
- **Database:** Neon Postgres 18, Drizzle ORM (`drizzle-orm/neon-http` in request handlers), migrations via `drizzle-kit`
- **Ingestion:** MoneyPuck CSVs + NHL API via Vercel Cron routes (`/api/cron/*`) and a local backfill CLI; node-postgres on the direct connection

## Commands

All commands run from `client/`:

```bash
npm ci                  # install
npm run dev             # dev server on http://localhost:3000
npm run build           # production build (Nitro; Vercel output when built on Vercel) + typecheck
npm run start           # run the production build locally
npm run lint
npm run typecheck
npm test                # Vitest (src/**/*.test.ts)

npm run db:generate     # generate a migration from src/server/db/schema.ts
npm run db:migrate      # apply migrations (uses DATABASE_URL_UNPOOLED, else DATABASE_URL)
npm run db:check        # check migration consistency
npm run db:studio
npm run backfill -- --yes   # load 2008 → current (resumable; see docs/INGESTION_NOTES.md)
```

Scratch local database (throwaway, no volume):

```bash
docker run -d --rm --name bw-pg18-scratch -e POSTGRES_PASSWORD=scratch -e POSTGRES_DB=benchwarmer -p 55432:5432 postgres:18
DATABASE_URL=postgresql://postgres:scratch@localhost:55432/benchwarmer npm run db:migrate
```

## Architecture

```
client/                       # the app (TanStack Start)
├── src/router.tsx            # getRouter(): router + per-router QueryClient
├── src/start.ts              # createStart(): defaultSsr: false (SPA-style rendering)
├── src/routes/               # UI routes; __root.tsx is the HTML shell + providers
├── src/routes/api/           # /api/* server routes ($.ts = JSON 404 for unported paths)
├── src/routes/api/cron/      # ingestion cron jobs (schedules in vite.config.ts)
├── src/server/db/            # schema.ts (Drizzle) + client.ts (getDb)
├── src/server/ingestion/     # MoneyPuck/NHL downloads, CSV specs, importers, steps
├── src/server/cron.ts        # cron route auth/wrapper (CRON_SECRET)
├── src/server/http.ts        # shared Response helpers
├── src/lib/api.ts            # axios client for same-origin /api (contract the UI depends on)
├── src/types/                # response shapes: source of truth for the /api contract
├── drizzle/                  # migrations; 0000_init.sql is the baseline (incl. materialized views)
└── scripts/                  # CLI scripts (backfill.ts)

server/                       # legacy C# (reference only, see above)
docs/MIGRATION_PLAN.md        # migration phases
docs/SCHEMA_NOTES.md          # how the schema maps to the EF model, and deliberate differences
docs/INGESTION_NOTES.md       # ingestion steps, cron, backfill, and fixes vs the C# jobs
```

## Key Configuration

- **Environment** (see `client/.env.example`): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct, for migrations and backfill), `CRON_SECRET`. Locally, put them in `.env.local` at the repo root (where `neon link` writes it) or in `client/.env.local` (which takes precedence).
- `getDb()` uses neon-http for Neon URLs and node-postgres for localhost URLs, so a scratch docker Postgres works in development.
- Rendering: routes are client-rendered (`defaultSsr: false`); only the root shell is server-rendered. Components may use `window`/`localStorage` freely.
- `/api` routes must set an explicit handler for each method they support, plus `ANY: methodNotAllowed`, so wrong-method requests don't fall through to the HTML shell.

## Database

- Drizzle owns the schema. Change `src/server/db/schema.ts`, then `npm run db:generate`. Never edit an applied migration.
- Table/column names intentionally match the old EF model (including quirks like `went_to_o_t`). See `docs/SCHEMA_NOTES.md`.
- Materialized views (`chemistry_pairs`, `season_percentiles`) are `.existing()` in the schema; their DDL is hand-written SQL in migrations. Refresh with `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- `numeric` columns are mapped to JS numbers (`mode: "number"`). Ingestion writes exact decimal text instead (see `UpsertRow` in `src/server/ingestion/db.ts`).

## Ingestion

- MoneyPuck CSV field specs live in `src/server/ingestion/records.ts` (mirrors the old C# `*Record.cs`). Importers copy same-named fields generically (`map.ts`) and hand-write only the exceptions.
- All writes go through `upsert()` (`db.ts`): batched `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... IS DISTINCT FROM`, so re-runs write ~0 rows. Keep it that way: Neon cost depends on it.
- Every step runs inside `runStep()` so it's logged in `sync_runs`.
- Be polite to MoneyPuck: sequential downloads only.

## Code Style

### Frontend (React/TypeScript)

- **No JSX comments**: Do not use `{/* comment */}` syntax in JSX. If a comment is truly needed, use regular JS comments outside of JSX or refactor to make the code self-documenting.
- Use `@/` path-alias imports, not relative imports (enforced by ESLint).

## Documentation

- `docs/MIGRATION_PLAN.md` - C# → TypeScript migration plan
- `docs/SCHEMA_NOTES.md` - schema derivation and differences from the EF model
- `docs/INGESTION_NOTES.md` - ingestion steps, cron schedule, backfill, and fixes vs the C# jobs
- `docs/PRD.md` - Product requirements (pre-migration)
- `docs/TODO.md` - Implementation checklist (pre-migration)
