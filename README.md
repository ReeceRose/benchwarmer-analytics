# Benchwarmer Analytics

A hockey analytics platform for exploring NHL data, line combinations, and player performance metrics.

*"Analysis from the cheap seats"*

---

## Overview

Benchwarmer Analytics provides interactive tools for analyzing NHL player and line performance using advanced statistics. The platform ingests data from MoneyPuck and presents it through a modern web interface with visualizations including shot maps, chemistry matrices, and trend analysis.

### Key Features

- **Line/Pairing Explorer** — Sortable, filterable tables of forward lines and defensive pairings with on-ice metrics
- **Chemistry Heat Map** — Matrix visualization showing how player pairs perform together
- **Shot Maps** — Rink visualizations with expected goal (xG) probability coloring
- **Player Comparison** — Side-by-side statistical comparison with radar charts

### Questions This Tool Answers

- Which line combinations are performing above or below expected goals?
- How do specific player pairings trend over the course of a season?
- Which defensive pairs are getting outchanced at 5v5?
- What does a player's shot distribution look like across different game situations?

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| .NET 10 / ASP.NET Core | REST API with Minimal APIs |
| Entity Framework Core 10 | ORM and data access |
| PostgreSQL 17 | Relational database |
| Hangfire | Background job scheduling for data ingestion |
| CsvHelper | CSV parsing for MoneyPuck data |
| Serilog | Structured logging |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript 5.7 | Type safety |
| Vite | Build tooling |
| TanStack Query | Server state management |
| TanStack Router | Type-safe routing |
| shadcn/ui + Tailwind CSS | Component library and styling |
| Recharts + D3.js | Data visualization |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Azure Container Apps | Application hosting |
| Azure Database for PostgreSQL | Managed database |
| GitHub Actions | CI/CD pipelines |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MoneyPuck     │     │    NHL API      │     │   React SPA     │
│   CSV Data      │     │  (Player Bios)  │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────────────────────────────┐              │
│         Ingestion Service               │              │
│  (Hangfire Jobs + CsvHelper Parsers)    │              │
└────────────────────┬────────────────────┘              │
                     │                                   │
                     ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ASP.NET Core API                           │
│                     (Minimal API Endpoints)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                         │
│  (Players, Teams, SkaterStats, LineCombinations, Shots)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/products/docker-desktop/)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/reecerose/benchwarmer-analytics.git
   cd benchwarmer-analytics
   ```

2. **Start PostgreSQL**
   ```bash
   ./scripts/dev.sh
   ```

3. **Run database migrations** (after creating them in Phase 3)
   ```bash
   ./scripts/dev.sh migrate
   ```

4. **Start the API** (Terminal 1)
   ```bash
   dotnet watch run --project server/Benchwarmer.Api --no-hot-reload
   ```

5. **Start the frontend** (Terminal 2)
   ```bash
   cd client && npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:5000
   - Swagger: http://localhost:5000/swagger
   - Hangfire Dashboard: http://localhost:5000/hangfire

### Development Script

Database and infrastructure tasks are handled by `./scripts/dev.sh`:

| Command | Description |
|---------|-------------|
| `./scripts/dev.sh` | Start PostgreSQL |
| `./scripts/dev.sh stop` | Stop all Docker containers |
| `./scripts/dev.sh migrate` | Apply EF Core database migrations |
| `./scripts/dev.sh reset` | Drop and recreate databases (destroys data) |

### Database Connection

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `benchwarmer` |
| Username | `benchwarmer` |
| Password | `benchwarmer` |

---

## Data Sources

| Source | Data Provided | Update Frequency |
|--------|---------------|------------------|
| [MoneyPuck](https://moneypuck.com) | Player stats, line combinations, shot data, expected goals | Nightly |
| [NHL API](https://api-web.nhle.com) | Player biographical data, headshots, rosters | Weekly |

The ingestion service runs nightly at 4:00 AM EST to pull the latest statistics.

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/teams` | List all NHL teams |
| `GET /api/teams/{abbrev}` | Team details with roster |
| `GET /api/teams/{abbrev}/lines` | Line combinations with filters |
| `GET /api/teams/{abbrev}/chemistry-matrix` | Player pair performance matrix |
| `GET /api/players/{id}` | Player details |
| `GET /api/players/{id}/stats` | Player statistics by season/situation |
| `GET /api/players/{id}/shots` | Shot location data for visualizations |
| `GET /api/players/compare` | Multi-player comparison |
| `GET /api/seasons` | Available seasons |

See the [Swagger documentation](http://localhost:5000/swagger) for full API details.

---

## Project Structure

```
benchwarmer-analytics/
├── server/
│   ├── Benchwarmer.Api/           # ASP.NET Core Minimal API
│   ├── Benchwarmer.Data/          # EF Core entities and repositories
│   ├── Benchwarmer.Ingestion/     # Data download and import jobs
│   └── Benchwarmer.Tests/         # Unit and integration tests
├── client/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── hooks/                 # TanStack Query hooks
│   │   ├── routes/                # TanStack Router pages
│   │   └── lib/                   # Utilities and API client
│   └── public/                    # Static assets
├── docker-compose.yml
└── docs/
    └── PRD.md                     # Product requirements document
```

---

## Deployment

The application is deployed to Azure using GitHub Actions:

1. **On push to `main`**: Build and test both API and client
2. **On successful build**: Push container images to Azure Container Registry
3. **Deploy**: Update Azure Container Apps with new images

Infrastructure:
- **Compute**: Azure Container Apps (serverless containers)
- **Database**: Azure Database for PostgreSQL Flexible Server
- **CI/CD**: GitHub Actions

---

## Attribution

**Data provided by [MoneyPuck.com](https://moneypuck.com)**

Player biographical data from [NHL.com](https://nhl.com)

This is a personal portfolio project and is not affiliated with the NHL, any of its teams, or MoneyPuck.

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

## Author

**Reece Rose**

- Portfolio: [reecerose.com](https://reecerose.com)
- GitHub: [@reecerose](https://github.com/reecerose)
