using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class SkaterStatsRepository(IDbContextFactory<AppDbContext> dbFactory) : ISkaterStatsRepository
{
    public async Task<IReadOnlyList<SkaterSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var query = db.SkaterSeasons
            .Where(s => s.PlayerId == playerId);

        if (season.HasValue)
        {
            query = query.Where(s => s.Season == season.Value);
        }

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(s => s.Situation == situation);
        }

        return await query
            .OrderByDescending(s => s.Season)
            .ThenBy(s => s.Situation)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeasonAdvanced>> GetAdvancedByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var query = db.SkaterSeasonAdvanced
            .Where(s => s.PlayerId == playerId);

        if (season.HasValue)
        {
            query = query.Where(s => s.Season == season.Value);
        }

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(s => s.Situation == situation);
        }

        return await query
            .OrderByDescending(s => s.Season)
            .ThenBy(s => s.Situation)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeason>> GetByTeamSeasonAsync(
        string teamAbbrev,
        int season,
        string situation = "all",
        bool? isPlayoffs = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var query = db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Team == teamAbbrev && s.Season == season && s.Situation == situation);

        if (isPlayoffs.HasValue)
        {
            query = query.Where(s => s.IsPlayoffs == isPlayoffs.Value);
        }

        return await query
            .OrderByDescending(s => s.IceTimeSeconds)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeason>> GetBySeasonSituationAsync(
        int season,
        string situation,
        bool isPlayoffs = false,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && s.IsPlayoffs == isPlayoffs)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeason>> GetBreakoutCandidatesAsync(
        int season,
        int minGames = 20,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season &&
                       s.Situation == "all" &&
                       !s.IsPlayoffs &&
                       s.GamesPlayed >= minGames &&
                       s.ExpectedGoals.HasValue &&
                       s.ExpectedGoals > 0 &&
                       s.CorsiForPct.HasValue)
            .OrderByDescending(s => s.ExpectedGoals - s.Goals)
            .ThenByDescending(s => s.CorsiForPct)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<(int Age, decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int PlayerCount)>> GetLeagueAgeCurveAsync(
        int minGames = 20,
        bool useMedian = false,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        // Use raw SQL to do aggregation in the database instead of loading all rows into memory
        // Column aliases must match C# property names exactly (PascalCase)
        var sql = useMedian
            ? """
              SELECT
                  age as "Age",
                  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY points_per_60)::numeric, 2) as "PointsPer60",
                  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY goals_per_60)::numeric, 2) as "GoalsPer60",
                  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY xg_per_60)::numeric, 2) as "XgPer60",
                  COUNT(*)::int as "PlayerCount"
              FROM (
                  SELECT
                      s.season - EXTRACT(YEAR FROM p.birth_date)::int as age,
                      (s.goals + s.assists) / (s.ice_time_seconds / 3600.0) as points_per_60,
                      s.goals / (s.ice_time_seconds / 3600.0) as goals_per_60,
                      COALESCE(s.expected_goals, 0) / (s.ice_time_seconds / 3600.0) as xg_per_60
                  FROM skater_seasons s
                  JOIN players p ON s.player_id = p.id
                  WHERE s.situation = 'all'
                    AND s.is_playoffs = false
                    AND s.games_played >= {0}
                    AND s.ice_time_seconds > 3600
                    AND p.birth_date IS NOT NULL
              ) sub
              WHERE age BETWEEN 18 AND 45
              GROUP BY age
              ORDER BY age
              """
            : """
              SELECT
                  age as "Age",
                  ROUND(AVG(points_per_60)::numeric, 2) as "PointsPer60",
                  ROUND(AVG(goals_per_60)::numeric, 2) as "GoalsPer60",
                  ROUND(AVG(xg_per_60)::numeric, 2) as "XgPer60",
                  COUNT(*)::int as "PlayerCount"
              FROM (
                  SELECT
                      s.season - EXTRACT(YEAR FROM p.birth_date)::int as age,
                      (s.goals + s.assists) / (s.ice_time_seconds / 3600.0) as points_per_60,
                      s.goals / (s.ice_time_seconds / 3600.0) as goals_per_60,
                      COALESCE(s.expected_goals, 0) / (s.ice_time_seconds / 3600.0) as xg_per_60
                  FROM skater_seasons s
                  JOIN players p ON s.player_id = p.id
                  WHERE s.situation = 'all'
                    AND s.is_playoffs = false
                    AND s.games_played >= {0}
                    AND s.ice_time_seconds > 3600
                    AND p.birth_date IS NOT NULL
              ) sub
              WHERE age BETWEEN 18 AND 45
              GROUP BY age
              ORDER BY age
              """;

        var results = await db.Database
            .SqlQueryRaw<AgeCurveRow>(sql, minGames)
            .ToListAsync(cancellationToken);

        return results
            .Select(r => (r.Age, r.PointsPer60, r.GoalsPer60, r.XgPer60, r.PlayerCount))
            .ToList();
    }

    private sealed class AgeCurveRow
    {
        public int Age { get; init; }
        public decimal PointsPer60 { get; init; }
        public decimal GoalsPer60 { get; init; }
        public decimal XgPer60 { get; init; }
        public int PlayerCount { get; init; }
    }

    public async Task<IReadOnlyList<(int Age, int Season, decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int GamesPlayed)>> GetPlayerAgeCurveAsync(
        int playerId,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var player = await db.Players.FindAsync([playerId], cancellationToken);
        if (player?.BirthDate is null)
        {
            return [];
        }

        var birthYear = player.BirthDate.Value.Year;

        var data = await db.SkaterSeasons
            .Where(s => s.PlayerId == playerId &&
                       s.Situation == "all" &&
                       !s.IsPlayoffs &&
                       s.IceTimeSeconds > 0)
            .Select(s => new
            {
                s.Season,
                Age = s.Season - birthYear,
                Minutes = s.IceTimeSeconds / 60.0m,
                Points = s.Goals + s.Assists,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                s.GamesPlayed
            })
            .ToListAsync(cancellationToken);

        return data
            .Where(d => d.Minutes > 0)
            .Select(d => (d.Age,
                 d.Season,
                PointsPer60: Math.Round(d.Points / d.Minutes * 60, 2),
                GoalsPer60: Math.Round((decimal)d.Goals / d.Minutes * 60, 2),
                XgPer60: Math.Round(d.ExpectedGoals / d.Minutes * 60, 2),
                 d.GamesPlayed
            ))
            .OrderBy(d => d.Age)
            .ToList();
    }

    public async Task<IReadOnlyList<(decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int GamesPlayed)>> GetAgeDistributionAsync(
        int age,
        int minGames = 20,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var data = await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Situation == "all" &&
                       !s.IsPlayoffs &&
                       s.GamesPlayed >= minGames &&
                       s.IceTimeSeconds > 3600 &&
                       s.Player != null &&
                       s.Player.BirthDate.HasValue &&
                       s.Season - s.Player.BirthDate.Value.Year == age)
            .Select(s => new
            {
                Minutes = s.IceTimeSeconds / 60.0m,
                Points = s.Goals + s.Assists,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                s.GamesPlayed
            })
            .ToListAsync(cancellationToken);

        return data
            .Where(d => d.Minutes > 0)
            .Select(d => (
                PointsPer60: Math.Round(d.Points / d.Minutes * 60, 2),
                GoalsPer60: Math.Round((decimal)d.Goals / d.Minutes * 60, 2),
                XgPer60: Math.Round(d.ExpectedGoals / d.Minutes * 60, 2),
                 d.GamesPlayed
            ))
            .ToList();
    }

    public async Task<SeasonPercentiles> GetSeasonPercentilesAsync(
        int season,
        int minGames = 20,
        CancellationToken cancellationToken = default)
    {
        // Use materialized view for the default minGames=20 (fast path)
        if (minGames == 20)
        {
            return await GetSeasonPercentilesFromViewAsync(season, cancellationToken);
        }

        // Fall back to runtime calculation for non-default minGames
        return await CalculateSeasonPercentilesAsync(season, minGames, cancellationToken);
    }

    private async Task<SeasonPercentiles> GetSeasonPercentilesFromViewAsync(
        int season,
        CancellationToken cancellationToken)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var rows = await db.SeasonPercentiles
            .Where(p => p.Season == season)
            .OrderBy(p => p.Percentile)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return new SeasonPercentiles(season, 20, 0, [], [], [], []);
        }

        var playerCount = rows[0].PlayerCount;
        var ppg = rows.Select(r => r.PointsPerGame).ToArray();
        var gpg = rows.Select(r => r.GoalsPerGame).ToArray();
        var pp60 = rows.Select(r => r.PointsPer60).ToArray();
        var gp60 = rows.Select(r => r.GoalsPer60).ToArray();

        return new SeasonPercentiles(season, 20, playerCount, ppg, gpg, pp60, gp60);
    }

    private async Task<SeasonPercentiles> CalculateSeasonPercentilesAsync(
        int season,
        int minGames,
        CancellationToken cancellationToken)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var data = await db.SkaterSeasons
            .Where(s => s.Season == season &&
                       s.Situation == "all" &&
                       !s.IsPlayoffs &&
                       s.GamesPlayed >= minGames &&
                       s.IceTimeSeconds > 0)
            .Select(s => new
            {
                s.GamesPlayed,
                Points = s.Goals + s.Assists,
                s.Goals,
                Minutes = s.IceTimeSeconds / 60.0m
            })
            .ToListAsync(cancellationToken);

        if (data.Count == 0)
        {
            return new SeasonPercentiles(season, minGames, 0, [], [], [], []);
        }

        var playerStats = data
            .Where(d => d.GamesPlayed > 0 && d.Minutes > 0)
            .Select(d => new
            {
                PointsPerGame = (decimal)d.Points / d.GamesPlayed,
                GoalsPerGame = (decimal)d.Goals / d.GamesPlayed,
                PointsPer60 = d.Points / d.Minutes * 60,
                GoalsPer60 = (decimal)d.Goals / d.Minutes * 60
            })
            .ToList();

        if (playerStats.Count == 0)
        {
            return new SeasonPercentiles(season, minGames, 0, [], [], [], []);
        }

        var ppgSorted = playerStats.Select(p => p.PointsPerGame).OrderBy(v => v).ToList();
        var gpgSorted = playerStats.Select(p => p.GoalsPerGame).OrderBy(v => v).ToList();
        var pp60Sorted = playerStats.Select(p => p.PointsPer60).OrderBy(v => v).ToList();
        var gp60Sorted = playerStats.Select(p => p.GoalsPer60).OrderBy(v => v).ToList();

        return new SeasonPercentiles(
            season,
            minGames,
            playerStats.Count,
            CalculatePercentileThresholds(ppgSorted),
            CalculatePercentileThresholds(gpgSorted),
            CalculatePercentileThresholds(pp60Sorted),
            CalculatePercentileThresholds(gp60Sorted)
        );
    }

    private static decimal[] CalculatePercentileThresholds(List<decimal> sortedValues)
    {
        var thresholds = new decimal[99];
        var count = sortedValues.Count;

        for (var p = 1; p <= 99; p++)
        {
            var rank = (p / 100.0) * (count - 1);
            var lowerIndex = (int)Math.Floor(rank);
            var upperIndex = (int)Math.Ceiling(rank);

            if (lowerIndex == upperIndex || upperIndex >= count)
            {
                thresholds[p - 1] = Math.Round(sortedValues[Math.Min(lowerIndex, count - 1)], 3);
            }
            else
            {
                var fraction = (decimal)(rank - lowerIndex);
                thresholds[p - 1] = Math.Round(
                    sortedValues[lowerIndex] + fraction * (sortedValues[upperIndex] - sortedValues[lowerIndex]),
                    3);
            }
        }

        return thresholds;
    }

    public async Task RefreshSeasonPercentilesAsync(CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync(
            "REFRESH MATERIALIZED VIEW CONCURRENTLY season_percentiles",
            cancellationToken);
    }

    public async Task UpsertBatchAsync(IEnumerable<SkaterSeason> stats, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var statsList = stats.ToList();
        if (statsList.Count == 0) return;

        var keys = statsList
            .Select(s => new { s.PlayerId, s.Season, s.Team, s.Situation, s.IsPlayoffs })
            .Distinct()
            .ToList();

        var playerIds = keys.Select(k => k.PlayerId).Distinct().ToList();
        var seasons = keys.Select(k => k.Season).Distinct().ToList();
        var teams = keys.Select(k => k.Team).Distinct().ToList();
        var situations = keys.Select(k => k.Situation).Distinct().ToList();
        var isPlayoffsValues = keys.Select(k => k.IsPlayoffs).Distinct().ToList();

        var existingRecords = await db.SkaterSeasons
            .Where(s => playerIds.Contains(s.PlayerId) &&
                       seasons.Contains(s.Season) &&
                       teams.Contains(s.Team) &&
                       situations.Contains(s.Situation) &&
                       isPlayoffsValues.Contains(s.IsPlayoffs))
            .ToListAsync(cancellationToken);

        var existingLookup = existingRecords
            .ToDictionary(s => (s.PlayerId, s.Season, s.Team, s.Situation, s.IsPlayoffs));

        var now = DateTime.UtcNow;

        foreach (var stat in statsList)
        {
            var key = (stat.PlayerId, stat.Season, stat.Team, stat.Situation, stat.IsPlayoffs);

            if (existingLookup.TryGetValue(key, out var existing))
            {
                existing.GamesPlayed = stat.GamesPlayed;
                existing.IceTimeSeconds = stat.IceTimeSeconds;
                existing.Goals = stat.Goals;
                existing.Assists = stat.Assists;
                existing.Shots = stat.Shots;
                existing.ExpectedGoals = stat.ExpectedGoals;
                existing.ExpectedGoalsPer60 = stat.ExpectedGoalsPer60;
                existing.OnIceShootingPct = stat.OnIceShootingPct;
                existing.OnIceSavePct = stat.OnIceSavePct;
                existing.CorsiForPct = stat.CorsiForPct;
                existing.FenwickForPct = stat.FenwickForPct;
                existing.UpdatedAt = now;
            }
            else
            {
                stat.CreatedAt = now;
                stat.UpdatedAt = now;
                db.SkaterSeasons.Add(stat);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeason>> GetHotPlayersByTeamAsync(
        string teamAbbrev,
        int season,
        int limit = 5,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Team == teamAbbrev &&
                       s.Season == season &&
                       s.Situation == "5on5" &&
                       !s.IsPlayoffs &&
                       s.GamesPlayed >= 10 &&
                       s.ExpectedGoals.HasValue &&
                       s.ExpectedGoals > 0)
            .OrderByDescending(s => s.Goals - s.ExpectedGoals)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SkaterSeason>> GetRookiesAsync(
        int season,
        int minGames = 10,
        int limit = 100,
        string? position = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        // Normalize position filter to parameter value
        var (filterForwards, filterDefense) = position?.ToUpperInvariant() switch
        {
            "F" => (true, false),
            "D" => (false, true),
            _ => (false, false) // No filter - include all positions
        };
        var includeAllPositions = !filterForwards && !filterDefense;

        // Query for rookies using NHL criteria:
        // 1. No prior season with RookieMaxPriorGames+ games played
        // 2. Under RookieMaxAge years old as of September 15 of the season year
        var sql = $$"""
            SELECT ss.id
            FROM skater_seasons ss
            JOIN players p ON ss.player_id = p.id
            WHERE ss.season = {0}
              AND ss.situation = 'all'
              AND ss.is_playoffs = false
              AND ss.games_played >= {1}
              AND p.birth_date IS NOT NULL
              -- Position filter (parameterized to avoid string concatenation)
              AND (
                  {2} = true
                  OR ({3} = true AND p.position IN ('C', 'LW', 'RW'))
                  OR ({4} = true AND p.position = 'D')
              )
              -- Rookie criteria 1: No prior season with {{NhlConstants.RookieMaxPriorGames}}+ games
              AND NOT EXISTS (
                  SELECT 1 FROM skater_seasons prior
                  WHERE prior.player_id = ss.player_id
                    AND prior.season < ss.season
                    AND prior.situation = 'all'
                    AND prior.is_playoffs = false
                    AND prior.games_played >= {{NhlConstants.RookieMaxPriorGames}}
              )
              -- Rookie criteria 2: Under {{NhlConstants.RookieMaxAge}} as of Sept 15 of season year
              AND (
                  EXTRACT(YEAR FROM AGE(MAKE_DATE({0}, 9, 15), p.birth_date)) < {{NhlConstants.RookieMaxAge}}
              )
            ORDER BY (ss.goals + ss.assists) DESC
            LIMIT {5}
            """;

        var skaterIds = await db.Database
            .SqlQueryRaw<int>(sql, season, minGames, includeAllPositions, filterForwards, filterDefense, limit)
            .ToListAsync(cancellationToken);

        if (skaterIds.Count == 0)
        {
            return [];
        }

        // Load full entities with Player navigation property
        var rookies = await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => skaterIds.Contains(s.Id))
            .ToListAsync(cancellationToken);

        // Preserve the order from the SQL query (by points DESC)
        var orderMap = skaterIds.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        return rookies.OrderBy(r => orderMap.GetValueOrDefault(r.Id, int.MaxValue)).ToList();
    }
}
