# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Benchwarmer Analytics is a hockey analytics platform for exploring NHL data, line combinations, and player performance. It ingests data from MoneyPuck and presents it through a web interface with visualizations.

**Status:** Early development - project structure exists but core functionality is not yet implemented.

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal APIs, Entity Framework Core 10, PostgreSQL 17
- **Frontend:** React 19, TypeScript, Vite, TanStack Query/Router, shadcn/ui, Tailwind CSS
- **Infrastructure:** Docker, Azure Container Apps, GitHub Actions

## Build Commands

```bash
# Build the entire solution
dotnet build server/

# Run the API (from project root)
ASPNETCORE_ENVIRONMENT=Development dotnet run --project server/Benchwarmer.Api

# Run with hot reload
ASPNETCORE_ENVIRONMENT=Development dotnet watch run --project server/Benchwarmer.Api

# Run all tests
dotnet test server/

# Run a single test by name
dotnet test server/Benchwarmer.Tests --filter "FullyQualifiedName~TestMethodName"

# Run tests in a specific class
dotnet test server/Benchwarmer.Tests --filter "FullyQualifiedName~ClassName"
```

## Architecture

```
server/
├── Benchwarmer.Api/        # ASP.NET Core Minimal API endpoints
├── Benchwarmer.Data/       # EF Core entities, DbContext, repositories
├── Benchwarmer.Ingestion/  # MoneyPuck data downloaders, CSV parsers, import jobs
└── Benchwarmer.Tests/      # xUnit tests

client/                     # React frontend (not yet created)
```

**Project References:**
- Api → Data, Ingestion
- Ingestion → Data
- Tests → Api, Data, Ingestion

## Key Configuration

- `Directory.Build.props` sets shared settings: `net10.0`, nullable enabled, warnings as errors
- Database: PostgreSQL 17
- Background jobs: Hangfire (for nightly data ingestion)
- **Database connection string**: Set via environment variable in `.env.local`:
  ```
  ConnectionStrings__DefaultConnection=your_connection_string_here
  ```
  Load with: `export $(cat .env.local | xargs)` before running the API

## Data Flow

1. **Ingestion Service** downloads CSV files from MoneyPuck (skaters, lines, shots)
2. **Parsers** convert CSV rows to domain models using CsvHelper
3. **Importers** upsert data to PostgreSQL via EF Core
4. **API** exposes data through REST endpoints
5. **Frontend** consumes API and renders visualizations

## Documentation

- `docs/PRD.md` - Full product requirements, database schema, API spec
- `docs/TODO.md` - Implementation checklist with phases
