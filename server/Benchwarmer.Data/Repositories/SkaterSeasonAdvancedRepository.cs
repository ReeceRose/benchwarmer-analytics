using System.Reflection;
using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class SkaterSeasonAdvancedRepository(IDbContextFactory<AppDbContext> dbFactory) : ISkaterSeasonAdvancedRepository
{
    private static readonly PropertyInfo[] UpdatableProperties = typeof(SkaterSeasonAdvanced)
        .GetProperties(BindingFlags.Public | BindingFlags.Instance)
        .Where(p =>
            p.CanRead &&
            p.CanWrite &&
            p.Name is not nameof(SkaterSeasonAdvanced.Id) and
                     not nameof(SkaterSeasonAdvanced.PlayerId) and
                     not nameof(SkaterSeasonAdvanced.Season) and
                     not nameof(SkaterSeasonAdvanced.Team) and
                     not nameof(SkaterSeasonAdvanced.Situation) and
                     not nameof(SkaterSeasonAdvanced.IsPlayoffs) and
                     not nameof(SkaterSeasonAdvanced.Player))
        .ToArray();

    public async Task UpsertBatchAsync(IEnumerable<SkaterSeasonAdvanced> stats, CancellationToken cancellationToken = default)
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

        var existingRecords = await db.SkaterSeasonAdvanced
            .Where(s => playerIds.Contains(s.PlayerId) &&
                        seasons.Contains(s.Season) &&
                        teams.Contains(s.Team) &&
                        situations.Contains(s.Situation) &&
                        isPlayoffsValues.Contains(s.IsPlayoffs))
            .ToListAsync(cancellationToken);

        var existingLookup = existingRecords
            .ToDictionary(s => (s.PlayerId, s.Season, s.Team, s.Situation, s.IsPlayoffs));

        foreach (var stat in statsList)
        {
            var key = (stat.PlayerId, stat.Season, stat.Team, stat.Situation, stat.IsPlayoffs);

            if (existingLookup.TryGetValue(key, out var existing))
            {
                foreach (var prop in UpdatableProperties)
                {
                    prop.SetValue(existing, prop.GetValue(stat));
                }
            }
            else
            {
                db.SkaterSeasonAdvanced.Add(stat);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

