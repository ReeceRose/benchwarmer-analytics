# Frontend Implementation Plan - Benchwarmer Analytics

## Overview

**Current State:** ~60% complete (Phases 1-4 done)
**Goal:** Full frontend with team/player browsing, line analysis tools, and data visualizations

**What's Already Done:**
- Vite + React 19 + TypeScript configured
- Tailwind CSS v4 configured
- shadcn/ui components installed (19 components)
- TanStack Query + Axios configured and used
- TanStack Router with file-based routing (10 routes)
- API proxy configured in vite.config.ts
- Dark mode with ThemeProvider + ThemeToggle
- Type definitions for all API DTOs
- API client layer with typed functions
- Custom hooks for data fetching
- Basic page layouts (Home, Teams, Players, About)
- Shared components (Header, Footer, Selectors, PlayerChip, StatCell, LoadingState, ErrorState)

**What Needs to Be Built:**
- ~25+ feature components (Line Explorer, Chemistry Matrix, Comparison, Charts, Line Builder)
- Recharts visualizations (trend charts, radar charts)
- D3.js chemistry heat map
- Line Builder with drag-and-drop

**Excluded (per user request):**
- Shot maps (no shot data pipeline yet)
- Shot-related API calls

---

## Phase 1: Foundation (~20 files) ✅ DONE

### 1.1 Install Dependencies & shadcn/ui Components ✅

**Additional npm packages:**
```bash
npm install @tanstack/react-router recharts d3 @dnd-kit/core @dnd-kit/sortable
npm install -D @types/d3
```

**shadcn/ui components:**
```bash
npx shadcn@latest add button card table tabs select input badge skeleton tooltip dropdown-menu collapsible navigation-menu avatar switch label separator command dialog popover
```

### 1.2 Dark Mode Setup ✅
- Add `ThemeProvider` component using `next-themes` pattern
- Configure Tailwind for dark mode (`class` strategy)
- Add theme toggle to Header
- Update `index.css` with dark mode CSS variables

### 1.3 Type Definitions ✅
Create `client/src/types/`:

- **`api.ts`** - API response wrapper types, error types
- **`team.ts`** - Team, TeamList DTOs
- **`player.ts`** - Player, PlayerDetail, PlayerStats, PlayerSearch DTOs
- **`line.ts`** - LineCombination, LineList, ChemistryMatrix, Linemate DTOs
- **`season.ts`** - Season DTOs

### 1.4 API Client Layer ✅
Create `client/src/lib/`:

- **`api.ts`** - Axios instance + typed API functions:
  - `getTeams()`, `getTeam(abbrev)`, `getTeamRoster(abbrev)`
  - `getTeamLines(abbrev, params)`, `getChemistryMatrix(abbrev, params)`
  - `searchPlayers(query)`, `getPlayer(id)`, `getPlayerStats(id, params)`
  - `getPlayerLinemates(id, params)`, `comparePlayers(ids, params)`
  - `getSeasons()`

- **`formatters.ts`** - Utility functions:
  - `formatToi(seconds)` → "12:34"
  - `formatSeason(year)` → "2024-25"
  - `formatPercent(value)` → "52.1%"
  - `formatDate(date)` → "Jan 13, 1997"

### 1.5 Custom Hooks ✅
Create `client/src/hooks/`:

- **`useTeams.ts`** - useQuery wrapper for teams
- **`usePlayer.ts`** - useQuery wrapper for player detail/stats
- **`useLines.ts`** - useQuery wrapper for line combinations
- **`useChemistryMatrix.ts`** - useQuery wrapper for chemistry data
- **`useSeasons.ts`** - useQuery wrapper for seasons

### 1.6 TanStack Router Setup ✅
Create `client/src/routes/`:

- **`__root.tsx`** - Root layout with nav + footer + theme provider
- **`index.tsx`** - Home dashboard
- **`about.tsx`** - About page
- **`teams/index.tsx`** - Team browser
- **`teams/$abbrev.tsx`** - Team detail with roster
- **`teams/$abbrev.lines.tsx`** - Line explorer
- **`teams/$abbrev.chemistry.tsx`** - Chemistry matrix
- **`teams/$abbrev.builder.tsx`** - Line builder
- **`players/index.tsx`** - Player search
- **`players/$id.tsx`** - Player detail with radar chart
- **`compare.tsx`** - Player comparison with radar chart

---

## Phase 2: Shared Components (~8 files) ✅ DONE

Create `client/src/components/shared/`:

| Component | Purpose | Status |
|-----------|---------|--------|
| **`Header.tsx`** | Navigation bar with logo, team dropdown, search | ✅ |
| **`Footer.tsx`** | MoneyPuck attribution (required) | ✅ |
| **`TeamSelector.tsx`** | Dropdown to select a team | ✅ |
| **`SeasonSelector.tsx`** | Dropdown to select a season | ✅ |
| **`SituationSelector.tsx`** | Dropdown for 5v5/PP/PK/all | ✅ |
| **`PlayerChip.tsx`** | Avatar + name badge | ✅ |
| **`StatCell.tsx`** | Value with color + trend arrow vs average | ✅ |
| **`LoadingState.tsx`** | Skeleton loaders | ✅ |
| **`ErrorState.tsx`** | Error display with retry | ✅ |

---

## Phase 3: Core Pages (~6 files) ✅ DONE

### 3.1 Home Dashboard (`/`) ✅
- League leaders strip with scrollable cards
- Luck chart showing teams running hot/cold
- Outliers section with expandable lists
- Top lines card
- Team grid quick links
- Season and situation selectors

### 3.2 Team Browser (`/teams`) ✅
- Grid of all teams with NHL logos
- Active/inactive team badges
- Links to team detail pages

### 3.3 Team Detail (`/teams/:abbrev`) ✅
- Team header with logo, name, division, conference
- Tab navigation: Roster | Lines | Chemistry
- Roster table grouped by position (F/D/G)
- Season filter with regular/playoff toggle
- Player stats columns (GP, TOI, G, A, P, S, xG, CF%)

### 3.4 Player Search (`/players`) ✅
- Search input with minimum 2-character requirement
- Results table with name, position, team links
- Empty state with search icon
- Error handling with retry

### 3.5 Player Detail (`/players/:id`) ✅
- Player header with avatar, name, bio info
- Career stats table with season-by-season breakdown
- Situation filter (All/5v5/PP/PK)
- Regular season + playoff columns
- Career totals row

### 3.6 About Page (`/about`) ✅
- Project description
- Data attribution (MoneyPuck)
- Tech stack cards
- Disclaimer

---

## Phase 4: Line Explorer (~5 files) ✅ DONE

Create `client/src/components/line-explorer/`:

| Component | Purpose | Status |
|-----------|---------|--------|
| **`LineExplorer.tsx`** | Main container with filters | ✅ |
| **`LineFilters.tsx`** | Situation, min TOI, sort controls | ✅ |
| **`LineTable.tsx`** | Sortable table of line combinations | ✅ |
| **`LineRow.tsx`** | Single line row with player chips + stats | ✅ |
| **`LineDetail.tsx`** | Expanded row with additional stats | ✅ |

**Features implemented:**
- Toggle between Forward Lines / Defensive Pairs ✅
- Filter by situation (5v5, PP, PK) ✅
- Filter by minimum TOI ✅
- Sort by stat columns (TOI, GF, GA, xG%, CF%, GP) ✅
- Pagination ✅
- Expandable rows with derived stats (GF/60, GA/60, TOI/GP) ✅
- Color coding vs team average (xG%, CF%) ✅

---

## Phase 5: Chemistry Matrix (~3 files)

Create `client/src/components/chemistry/`:

| Component | Purpose |
|-----------|---------|
| **`ChemistryMatrix.tsx`** | Main container |
| **`ChemistryHeatMap.tsx`** | D3.js heat map visualization |
| **`PlayerAxis.tsx`** | Axis labels with player names |

**Features:**
- Heat map grid showing player pair xG%
- Color scale: red (below avg) → white (avg) → green (above avg)
- Hover tooltip with detailed stats
- Filter by position (forwards/defense/all)
- Filter by situation

---

## Phase 6: Player Comparison Tool (~3 files)

Create `client/src/components/comparison/`:

| Component | Purpose |
|-----------|---------|
| **`ComparisonTool.tsx`** | Main container |
| **`PlayerSelector.tsx`** | Search + add players to compare |
| **`ComparisonTable.tsx`** | Side-by-side stats table |

**Features:**
- Add 2-5 players to compare
- Side-by-side stats table
- Highlight best/worst in each category
- Remove players from comparison

---

## Phase 7: Charts & Visualizations (~5 files)

Create `client/src/components/charts/`:

| Component | Purpose |
|-----------|---------|
| **`RadarComparison.tsx`** | Recharts radar chart for player stats |
| **`PerformanceTrend.tsx`** | Recharts line chart for trends over time |
| **`StatBar.tsx`** | Horizontal bar for single stat vs average |

**Recharts usage:**
- Radar chart on player detail page
- Radar chart on comparison tool
- Line charts for season trends (if historical data available)

---

## Phase 8: Line Builder (~5 files)

Create `client/src/components/line-builder/`:

| Component | Purpose |
|-----------|---------|
| **`LineBuilder.tsx`** | Main container |
| **`RosterPanel.tsx`** | Available players list |
| **`LineSlot.tsx`** | Drop zone for players |
| **`PlayerDragCard.tsx`** | Draggable player card |
| **`LineStatsPanel.tsx`** | Stats for selected combo |

**Dependencies:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Features:**
- Drag players from roster to line slots
- Show historical stats if combo has played together
- Show "no data" for hypothetical combos
- Reset button

---

## Implementation Order

| Step | Scope | Estimated Files | Status |
|------|-------|-----------------|--------|
| 1 | Phase 1.1: Install packages + shadcn/ui | 0 (CLI) | ✅ Done |
| 2 | Phase 1.2: Dark mode setup | 2 | ✅ Done |
| 3 | Phase 1.3-1.4: Types + API client | 8 | ✅ Done |
| 4 | Phase 1.5: Hooks | 5 | ✅ Done |
| 5 | Phase 1.6: Router setup + root layout | 3 | ✅ Done |
| 6 | Phase 2: Shared components | 10 | ✅ Done |
| 7 | Phase 3.1-3.2: Home + Team Browser | 2 | ✅ Done |
| 8 | Phase 3.3: Team Detail | 1 | ✅ Done |
| 9 | Phase 3.4-3.6: Player pages + About | 3 | ✅ Done |
| 10 | Phase 4: Line Explorer | 5 | ✅ Done |
| 11 | Phase 5: Chemistry Matrix (D3.js) | 3 |
| 12 | Phase 6: Player Comparison | 3 |
| 13 | Phase 7: Charts (Recharts) | 3 |
| 14 | Phase 8: Line Builder (dnd-kit) | 5 |

**Total: ~55-60 new files**

---

## File Structure After Implementation

```
client/src/
├── components/
│   ├── ui/                    # shadcn/ui (auto-generated)
│   ├── shared/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── TeamSelector.tsx
│   │   ├── SeasonSelector.tsx
│   │   ├── SituationSelector.tsx
│   │   ├── PlayerChip.tsx
│   │   ├── StatCell.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   └── ThemeToggle.tsx
│   ├── charts/
│   │   ├── RadarComparison.tsx
│   │   ├── PerformanceTrend.tsx
│   │   └── StatBar.tsx
│   ├── line-explorer/
│   │   ├── LineExplorer.tsx
│   │   ├── LineFilters.tsx
│   │   ├── LineTable.tsx
│   │   ├── LineRow.tsx
│   │   └── LineDetail.tsx
│   ├── chemistry/
│   │   ├── ChemistryMatrix.tsx
│   │   ├── ChemistryHeatMap.tsx
│   │   └── PlayerAxis.tsx
│   ├── comparison/
│   │   ├── ComparisonTool.tsx
│   │   ├── PlayerSelector.tsx
│   │   └── ComparisonTable.tsx
│   └── line-builder/
│       ├── LineBuilder.tsx
│       ├── RosterPanel.tsx
│       ├── LineSlot.tsx
│       ├── PlayerDragCard.tsx
│       └── LineStatsPanel.tsx
├── context/
│   └── ThemeProvider.tsx
├── hooks/
│   ├── useTeams.ts
│   ├── usePlayer.ts
│   ├── useLines.ts
│   ├── useChemistryMatrix.ts
│   └── useSeasons.ts
├── lib/
│   ├── api.ts
│   ├── formatters.ts
│   └── utils.ts               # existing
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── about.tsx
│   ├── compare.tsx
│   ├── teams/
│   │   ├── index.tsx
│   │   ├── $abbrev.tsx
│   │   ├── $abbrev.lines.tsx
│   │   └── $abbrev.chemistry.tsx
│   └── players/
│       ├── index.tsx
│       └── $id.tsx
├── types/
│   ├── api.ts
│   ├── team.ts
│   ├── player.ts
│   ├── line.ts
│   └── season.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## Verification

After implementation, verify:

1. **Build passes:** `npm run build`
2. **Lint passes:** `npm run lint`
3. **Dev server works:** `npm run dev`
4. **All routes load:** Navigate to each route
5. **API integration works:**
   - Teams page loads teams from API
   - Player search returns results
   - Line explorer shows line data
   - Chemistry matrix renders heat map
6. **Error states:** Test with API offline
7. **Responsive:** Test on mobile viewport

---

## Key Technical Decisions

- **Dark mode:** Implemented with CSS variables + `class` strategy
- **Charts:** Recharts for radar/line charts, D3.js for chemistry heat map
- **Drag & drop:** @dnd-kit/core + @dnd-kit/sortable for Line Builder
- **Routing:** TanStack Router with file-based routes
- **Data fetching:** TanStack Query with typed hooks
