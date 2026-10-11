# Ingestion notes

TypeScript port of `server/Benchwarmer.Ingestion` (code in
`app/src/server/ingestion/`). This records how it works and where it
deliberately differs from the C# jobs.

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
| `views` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` both views |

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
| `/api/cron/derived` | 09:45 daily | full-season score-state (only changes written) + view refresh |
| `/api/cron/bios` | Sun 10:00 | player bios |

Incremental shots: rows are imported only for games with no stored shots,
plus games from the last 3 days (MoneyPuck revises recent data). The season
zip is still downloaded and parsed (~5-15 s), but writes drop from the whole
season (C#) to the new games.

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
`--force`. Views are always refreshed at the end. Unlike the C# seed, the
backfill also loads games and score-state for every season.

## Differences from the C# ingestion

The schedule cron covers the coming week because the API no longer stores
games while serving requests (the C# API did; see `API_NOTES.md`).

Bugs fixed:

0. **Shots overwrote each other.** The C# schema and upsert keyed shots on
   MoneyPuck's `shotID`, which isn't unique: it restarts at 0 every season
   since 2018 (2008-2017 are numbered continuously), restarts mid-file in the
   in-progress season's file, and the 2008 file repeats some events under new
   shotIDs. Each season's import replaced other seasons' shots, which is why
   production held ~1.1M shots instead of ~2M. Shots are now keyed on
   `(game_id, event_id)`, and repeated events in a file are imported once.
1. **Score-state used the wrong clock.** MoneyPuck's `time` column is seconds
   since the start of the game (period 2 runs 1200-2400), but
   `ScoreStateTimeCalculator` treated it as time within the period. Every
   period after the first was inflated (and remaining time could go
   negative). The port converts to period-relative time. Each game now sums
   to 3600 s plus OT played, and home/away are symmetric.
2. **Line players came from last-name guessing.** `lines.csv` has a `lineId`
   that is the players' 7-digit NHL IDs concatenated. The port decodes it
   (exact). The C# matching skipped ~7% of lines (shared last names,
   accents such as "Valimaki" vs "Välimäki", mid-season trades) and could
   mis-assign players. Name matching remains only as a fallback, with accent
   folding and a played-that-season tiebreak.
3. **Playoff lines overwrote regular-season lines.** `line_combinations` has
   no playoffs column, so importing the playoff file replaced the
   regular-season numbers for every line that played in both. The lines API
   only serves regular season, so only regular-season files are imported.
4. **Nightly job wrote playoff team stats as regular season.** It called
   `TeamImporter.ImportAsync` without the playoffs flag. Fixed.
5. **Weekly bio sync un-normalized positions.** Bios store `L`/`R`, while
   season imports store `LW`/`RW`, and forward filters (special teams,
   chemistry) only match `C`/`LW`/`RW`. Bio positions are now normalized too.
6. **Re-importing an old season rolled back current teams.** Season imports
   overwrote `players.current_team_abbreviation` regardless of season. Now a
   season older than the player's newest stored season leaves them alone.
7. **Score-state for games without shot data.** C# wrote final NHL games
   with no MoneyPuck shots yet as 60 minutes tied. They're now skipped until
   shots arrive. Home/away codes come from the shots themselves (same source
   as the goal team codes), and shootouts count the OT period consistently.

Behavior kept on purpose:

- `players.position` / `current_team_abbreviation` are written by both bio
  and season imports and can disagree for a few hundred players (traded
  players, position labels). That produces small, harmless churn between the
  weekly bio run and the daily season runs, as before.
- Team divisions use the current alignment for all seasons (C# table).
- Lines whose IDs can't be decoded and whose names are genuinely ambiguous
  (for example two Nylanders on TOR in 2024) are skipped and counted in the
  log.

Other differences:

- Empty optional text values are stored as NULL instead of `""`.
- Derived decimals use decimal.js at 28 significant digits with banker's
  rounding (System.Decimal semantics). Results can differ only in the last
  digits of unrounded ratios.
