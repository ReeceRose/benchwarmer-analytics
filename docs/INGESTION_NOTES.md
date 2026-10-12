# Ingestion notes

Code in `app/src/server/ingestion/`. This records how ingestion works and the
data quirks it handles.

## Sources

| Data | URL | Notes |
|---|---|---|
| Season summaries | `moneypuck.com/moneypuck/playerData/seasonSummary/{season}/{regular\|playoffs}/{teams,skaters,goalies,lines}.csv` | Playoff files 404 until the playoffs start (treated as "no data") |
| Player bios | `moneypuck.com/moneypuck/playerData/playerBios/allPlayersLookup.csv` | |
| Shots | `peter-tanner.com/moneypuck/downloads/shots_{season}.zip` | MoneyPuck's official shot-data mirror; ~20 MB zip / ~120k rows per season |
| Games | `api-web.nhle.com/v1/schedule/{date}` | Returns one week per request |

Downloads are sequential, with a descriptive User-Agent and exponential
backoff on network errors, 429 and 5xx.

## Steps

All steps are idempotent upserts. Unchanged rows aren't rewritten
(`IS DISTINCT FROM`), so a re-run writes ~0 rows. Each run is logged in
`sync_runs`.

| Step (`sync_runs.step`) | Work |
|---|---|
| `bios` | Player bios → `players` |
| `teams` | `teams.csv` "Team Level" rows → `teams`, `team_seasons` (regular + playoffs) |
| `skaters` | → `players` (basic info), `skater_seasons` (+ derived rates), `skater_season_advanced` |
| `goalies` | → `players`, `goalie_seasons` (+ save %, GAA, GSAx) |
| `lines` | → `line_combinations` (regular season only, see below) |
| `shots` | → `shots` (full, or incremental for cron) |
| `games` | NHL schedule → `games` |
| `score_state` | `shots` goals → `game_score_state_times` |
| `views` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` both views, then `ANALYZE` (Neon resets autovacuum's counters when the compute scales to zero, so planner stats would otherwise go stale) |

Order within a season matters: lines resolve players through that season's
skater rows (name fallback only), and score-state reads shots.

## Cron (Vercel)

Defined in `app/vite.config.ts` and emitted into the Vercel build output.
Every route requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends
it) and accepts `?season=YYYY` for manual re-runs.

| Route | UTC | Work |
|---|---|---|
| `/api/cron/schedule` | 09:00 daily | games from yesterday through the next 7 days (ET) |
| `/api/cron/season-stats` | 09:15 daily | teams, skaters, goalies, lines for the current season |
| `/api/cron/shots` | 09:30 daily | incremental shots + score-state for the touched games |
| `/api/cron/derived` | 09:45 daily | full-season score-state (only changes written) + view refresh + `ANALYZE` |
| `/api/cron/bios` | Sun 10:00 | player bios |

Incremental shots: rows are imported only for games with no stored shots,
plus games from the last 3 days (MoneyPuck revises recent data). The season
zip is still downloaded and parsed (~5-15 s), but only the new games are
written.

Vercel Hobby runs crons once a day at most and only guarantees the hour, so
the stagger isn't strict there. Each step tolerates running before the
previous one, and the shots route computes score-state itself.

## Backfill

```bash
cd app
npm run backfill -- --yes                         # 2008 → current, every step
npm run backfill -- --from-season 2024 --dataset shots,score_state --force --yes
```

Resumable: (step, season) pairs that already succeeded are skipped unless
`--force`. Views are always refreshed at the end. The backfill loads games
and score-state for every season too. It runs outside Vercel, so it can't
purge the API cache; run `vercel cache invalidate --tag api` afterwards (see
`DEPLOY_NOTES.md`).

## Data quirks and decisions

- **Games.** The API doesn't write to the DB, so the schedule cron stores the
  coming week up front (see `API_NOTES.md`).
- **Shot keys.** MoneyPuck's `shotID` isn't unique: it restarts at 0 every
  season since 2018 (2008-2017 are numbered continuously), restarts mid-file
  in the in-progress season's file, and the 2008 file repeats some events
  under new shotIDs. Shots are keyed on `(game_id, event_id)`, and repeated
  events in a file are imported once.
- **Score-state clock.** MoneyPuck's `time` column is seconds since the start
  of the game (period 2 runs 1200-2400); it's converted to period-relative
  time. Each game sums to 3600 s plus OT played, and home/away are symmetric.
- **Line players.** `lines.csv` has a `lineId` that is the players' 7-digit
  NHL IDs concatenated; it's decoded exactly. Last-name matching would skip
  ~7% of lines (shared last names, accents such as "Valimaki" vs
  "Välimäki", mid-season trades), so it's only a fallback, with accent
  folding and a played-that-season tiebreak. Lines whose IDs can't be
  decoded and whose names are genuinely ambiguous (for example two Nylanders
  on TOR in 2024) are skipped and counted in the log.
- **Playoff lines.** `line_combinations` has no playoffs column and the lines
  API only serves regular season, so only regular-season line files are
  imported (a playoff import would overwrite regular-season rows).
- **Team stats.** The playoffs flag is passed through for team imports, so
  playoff rows never land as regular season.
- **Positions.** Bios store `L`/`R`, while season files use `LW`/`RW`, and
  forward filters (special teams, chemistry) only match `C`/`LW`/`RW`, so bio
  positions are normalized to `LW`/`RW`.
- **Current team.** Importing a season older than a player's newest stored
  season leaves `players.current_team_abbreviation` alone.
- **Score-state without shots.** Final games with no MoneyPuck shots yet are
  skipped until shots arrive. Home/away codes come from the shots themselves
  (same source as the goal team codes), and shootouts count the OT period.
- `players.position` / `current_team_abbreviation` are written by both bio
  and season imports and can disagree for a few hundred players (traded
  players, position labels). That produces small, harmless churn between the
  weekly bio run and the daily season runs.
- Team divisions use the current alignment for all seasons.
- **Team names.** On "Team Level" rows MoneyPuck's `name` column is just the
  abbreviation, so `teams.name` comes from `TEAM_NAMES` in
  `src/lib/team-names.ts` (shared with the UI and the games API). Relocated
  franchises keep the name they last played under.
- Empty optional text values are stored as NULL.
- Derived decimals use decimal.js at 28 significant digits with banker's
  rounding.
