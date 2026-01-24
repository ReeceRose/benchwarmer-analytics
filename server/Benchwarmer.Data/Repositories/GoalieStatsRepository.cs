using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class GoalieStatsRepository(IDbContextFactory<AppDbContext> dbFactory) : IGoalieStatsRepository
{
    public async Task<IReadOnlyList<GoalieSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var query = db.GoalieSeasons
            .Where(g => g.PlayerId == playerId);

        if (season.HasValue)
        {
            query = query.Where(g => g.Season == season.Value);
        }

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(g => g.Situation == situation);
        }

        return await query
            .OrderByDescending(g => g.Season)
            .ThenBy(g => g.Situation)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<GoalieSeason>> GetByTeamSeasonAsync(
        string teamAbbrev,
        int season,
        string situation = "all",
        bool? isPlayoffs = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var query = db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Team == teamAbbrev && g.Season == season && g.Situation == situation);

        if (isPlayoffs.HasValue)
        {
            query = query.Where(g => g.IsPlayoffs == isPlayoffs.Value);
        }

        return await query
            .OrderByDescending(g => g.IceTimeSeconds)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertBatchAsync(IEnumerable<GoalieSeason> stats, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var statsList = stats.ToList();
        if (statsList.Count == 0) return;

        var keys = statsList
            .Select(g => new { g.PlayerId, g.Season, g.Team, g.Situation, g.IsPlayoffs })
            .Distinct()
            .ToList();

        var playerIds = keys.Select(k => k.PlayerId).Distinct().ToList();
        var seasons = keys.Select(k => k.Season).Distinct().ToList();
        var teams = keys.Select(k => k.Team).Distinct().ToList();
        var situations = keys.Select(k => k.Situation).Distinct().ToList();
        var isPlayoffsValues = keys.Select(k => k.IsPlayoffs).Distinct().ToList();

        var existingRecords = await db.GoalieSeasons
            .Where(g => playerIds.Contains(g.PlayerId) &&
                       seasons.Contains(g.Season) &&
                       teams.Contains(g.Team) &&
                       situations.Contains(g.Situation) &&
                       isPlayoffsValues.Contains(g.IsPlayoffs))
            .ToListAsync(cancellationToken);

        var existingLookup = existingRecords
            .ToDictionary(g => (g.PlayerId, g.Season, g.Team, g.Situation, g.IsPlayoffs));

        var now = DateTime.UtcNow;

        foreach (var stat in statsList)
        {
            var key = (stat.PlayerId, stat.Season, stat.Team, stat.Situation, stat.IsPlayoffs);

            if (existingLookup.TryGetValue(key, out var existing))
            {
                existing.GamesPlayed = stat.GamesPlayed;
                existing.IceTimeSeconds = stat.IceTimeSeconds;
                existing.GoalsAgainst = stat.GoalsAgainst;
                existing.ShotsAgainst = stat.ShotsAgainst;
                existing.ExpectedGoalsAgainst = stat.ExpectedGoalsAgainst;
                existing.SavePercentage = stat.SavePercentage;
                existing.GoalsAgainstAverage = stat.GoalsAgainstAverage;
                existing.GoalsSavedAboveExpected = stat.GoalsSavedAboveExpected;
                existing.LowDangerShots = stat.LowDangerShots;
                existing.MediumDangerShots = stat.MediumDangerShots;
                existing.HighDangerShots = stat.HighDangerShots;
                existing.LowDangerGoals = stat.LowDangerGoals;
                existing.MediumDangerGoals = stat.MediumDangerGoals;
                existing.HighDangerGoals = stat.HighDangerGoals;
                existing.ExpectedRebounds = stat.ExpectedRebounds;
                existing.Rebounds = stat.Rebounds;
                existing.UpdatedAt = now;
            }
            else
            {
                stat.CreatedAt = now;
                stat.UpdatedAt = now;
                db.GoalieSeasons.Add(stat);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
