using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class SkaterStatsRepository(AppDbContext db) : ISkaterStatsRepository
{
    public async Task<IReadOnlyList<SkaterSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
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

    public async Task UpsertBatchAsync(IEnumerable<SkaterSeason> stats, CancellationToken cancellationToken = default)
    {
        var statsList = stats.ToList();
        if (statsList.Count == 0) return;

        // Extract unique keys to batch-fetch existing records (including IsPlayoffs)
        var keys = statsList
            .Select(s => new { s.PlayerId, s.Season, s.Team, s.Situation, s.IsPlayoffs })
            .Distinct()
            .ToList();

        // Batch fetch all potentially existing records in a single query
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

        // Build dictionary for O(1) lookup (including IsPlayoffs in key)
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
}
