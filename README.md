# Benchwarmer Analytics

A hockey analytics platform for exploring NHL data, line combinations, and player performance metrics.

*"Analysis from the cheap seats"*

Live at [benchwarmer.reecerose.com](https://benchwarmer.reecerose.com).

---

## Overview

Benchwarmer Analytics provides interactive tools for analyzing NHL player, line and team performance using advanced statistics. It ingests data from MoneyPuck and the NHL API every night and presents it through a web interface with visualizations including shot maps, chemistry matrices, and trend analysis.

### Key Features

- **Games** — Daily scoreboard, box scores, game previews, shot maps, and a "deserve to win" model based on expected goals
- **Line/Pairing Explorer** — Sortable, filterable tables of forward lines and defensive pairings with on-ice metrics
- **Chemistry Heat Map** — Matrix visualization showing how player pairs perform together
- **Line Builder** — Build hypothetical lines from a team's roster and compare them
- **Shot Maps** — Rink visualizations with expected goal (xG) probability coloring, for teams, players and games
- **Player Pages and Comparison** — Career stats, rolling form, goalie workload, linemates, and side-by-side radar charts
- **Standings and Rankings** — Official standings, power rankings, and category rankings
- **League Views** — Leaderboards, special teams, league trends, age curves, breakout candidates, and a rookie watcher

### Questions This Tool Answers

- Which line combinations are performing above or below expected goals?
- How do specific player pairings trend over the course of a season?
- Which defensive pairs are getting outchanced at 5v5?
- What does a player's shot distribution look like across different game situations?

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [TanStack Start](https://tanstack.com/start) (React 19, TypeScript, Vite) | App framework: UI routes and `/api/*` server routes |
| TanStack Router + Query | Routing and server state |
| shadcn/ui + Tailwind CSS | Components and styling |
| Recharts + D3 | Data visualization |
| [Neon](https://neon.com) Postgres 18 | Database (serverless, scales to zero) |
| Drizzle ORM | Schema, migrations, and queries |
| Vercel | Hosting (Nitro build), CDN caching, and Cron for nightly ingestion |
| Vitest | Tests |

---

## Architecture

```
┌─────────────────┐   ┌─────────────────┐
│   MoneyPuck     │   │    NHL API      │
│   CSVs + shots  │   │  schedule, bios │
└────────┬────────┘   └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────┐
│  Vercel Cron → /api/cron/* (nightly)    │
│  Local backfill CLI (scripts/backfill)  │
└────────────────────┬────────────────────┘
                     │ upserts (only changed rows)
                     ▼
┌─────────────────────────────────────────┐
│   Neon Postgres (Drizzle schema)        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐      ┌──────────────┐
│  TanStack Start on Vercel               │ ◀──▶ │  Vercel CDN  │ ◀── browser
│  /api/* server routes + React UI        │      │ (s-maxage)   │
└─────────────────────────────────────────┘      └──────────────┘
```

API responses carry CDN cache headers (15 seconds to 24 hours depending on the data), so repeat reads don't reach the database and Neon can scale to zero between requests.

---

## Getting Started

### Prerequisites

- [Node.js 24](https://nodejs.org/)
- A Neon database, or [Docker](https://www.docker.com/products/docker-desktop/) for a local Postgres

### Local Development

All commands run from `app/`.

1. **Install dependencies**
   ```bash
   cd app
   npm ci
   ```

2. **Configure the database** (see `app/.env.example`)

   Put `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct) and `CRON_SECRET` in `.env.local`, either at the repo root (where `neon link` writes it) or in `app/`.

   Or use a throwaway local Postgres:
   ```bash
   docker run -d --rm --name bw-pg18-scratch -e POSTGRES_PASSWORD=scratch -e POSTGRES_DB=benchwarmer -p 55432:5432 postgres:18
   export DATABASE_URL=postgresql://postgres:scratch@localhost:55432/benchwarmer
   ```

3. **Apply migrations and load data**
   ```bash
   npm run db:migrate
   npm run backfill -- --from-season 2025 --yes   # or omit --from-season for 2008 → current
   ```

4. **Run the app**
   ```bash
   npm run dev   # http://localhost:3000
   ```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build + typecheck |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks |
| `npm run db:generate` | Generate a migration from `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run backfill -- --yes` | Load historical data (resumable) |

---

## Data Sources

| Source | Data Provided | Update Frequency |
|--------|---------------|------------------|
| [MoneyPuck](https://moneypuck.com) | Advanced stats, line combinations, shot data, expected goals (xG), player bios | Nightly (bios weekly) |
| [NHL API](https://api-web.nhle.com) | Schedules, scores, box scores, standings | Nightly for schedules; on request for live data |

Vercel Cron runs the ingestion steps between 09:00 and 10:00 UTC (around 5 AM Eastern). See [docs/INGESTION_NOTES.md](docs/INGESTION_NOTES.md).

---

## API

The UI reads everything through a REST API under `/api`: seasons, teams, players, standings, special teams, stats, and games. See [docs/API_NOTES.md](docs/API_NOTES.md) for the endpoint groups and caching, and `app/src/types/` for response shapes.

---

## Project Structure

```
benchwarmer-analytics/
├── app/
│   ├── src/
│   │   ├── routes/            # UI routes, plus /api/* and /api/cron/* server routes
│   │   ├── server/            # API handlers, Drizzle schema, ingestion
│   │   ├── components/        # React components
│   │   ├── hooks/             # TanStack Query hooks
│   │   ├── lib/               # Utilities and API client
│   │   └── types/             # API response types
│   ├── drizzle/               # SQL migrations
│   └── scripts/               # Backfill CLI
└── docs/                      # Schema, ingestion, API, and deploy notes
```

---

## Deployment

The Vercel project deploys `app/` automatically: pull requests get preview deployments, and merges to `main` deploy production. Database migrations are applied manually before deploying code that needs them. See [docs/DEPLOY_NOTES.md](docs/DEPLOY_NOTES.md).

---

## Attribution

**Data Sources:**
- Advanced statistics provided by [MoneyPuck.com](https://moneypuck.com)
- Game schedules, box scores, and player data from [NHL.com](https://nhl.com) API

This is a personal portfolio project and is not affiliated with the NHL, NHLPA, any of its teams, or MoneyPuck. NHL and the NHL Shield are registered trademarks of the National Hockey League.

---

## License

MIT License — See [LICENSE.md](LICENSE.md) for details.

---

## Author

**Reece Rose**

- Portfolio: [reecerose.com](https://reecerose.com)
- GitHub: [@reecerose](https://github.com/reecerose)
