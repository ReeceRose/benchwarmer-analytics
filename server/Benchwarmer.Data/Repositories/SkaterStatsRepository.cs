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

    public async Task UpsertBatchAsync(IEnumerable<SkaterSeason> stats, CancellationToken cancellationToken = default)
    {
        foreach (var stat in stats)
        {
            var existing = await db.SkaterSeasons
                .FirstOrDefaultAsync(s =>
                    s.PlayerId == stat.PlayerId &&
                    s.Season == stat.Season &&
                    s.Team == stat.Team &&
                    s.Situation == stat.Situation,
                    cancellationToken);

            if (existing is null)
            {
                stat.CreatedAt = DateTime.UtcNow;
                stat.UpdatedAt = DateTime.UtcNow;
                db.SkaterSeasons.Add(stat);
            }
            else
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
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
