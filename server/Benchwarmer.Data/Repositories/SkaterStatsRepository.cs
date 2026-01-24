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
        var data = await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Situation == "all" &&
                       !s.IsPlayoffs &&
                       s.GamesPlayed >= minGames &&
                       s.IceTimeSeconds > 3600 &&
                       s.Player != null &&
                       s.Player.BirthDate.HasValue)
            .Select(s => new
            {
                Age = s.Season - s.Player!.BirthDate!.Value.Year,
                Minutes = s.IceTimeSeconds / 60.0m,
                Points = s.Goals + s.Assists,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0
            })
            .ToListAsync(cancellationToken);

        var grouped = data
            .Where(d => d.Age >= 18 && d.Age <= 45 && d.Minutes > 0)
            .GroupBy(d => d.Age)
            .Select(g =>
            {
                var pointsPer60Values = g.Select(d => d.Points / d.Minutes * 60).OrderBy(v => v).ToList();
                var goalsPer60Values = g.Select(d => (decimal)d.Goals / d.Minutes * 60).OrderBy(v => v).ToList();
                var xgPer60Values = g.Select(d => d.ExpectedGoals / d.Minutes * 60).OrderBy(v => v).ToList();

                return (
                    Age: g.Key,
                    PointsPer60: Math.Round(useMedian ? Median(pointsPer60Values) : pointsPer60Values.Average(), 2),
                    GoalsPer60: Math.Round(useMedian ? Median(goalsPer60Values) : goalsPer60Values.Average(), 2),
                    XgPer60: Math.Round(useMedian ? Median(xgPer60Values) : xgPer60Values.Average(), 2),
                    PlayerCount: g.Count()
                );
            })
            .OrderBy(x => x.Age)
            .ToList();

        return grouped;
    }

    private static decimal Median(List<decimal> sortedValues)
    {
        if (sortedValues.Count == 0) return 0;
        var mid = sortedValues.Count / 2;
        return sortedValues.Count % 2 == 0
            ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
            : sortedValues[mid];
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
}
