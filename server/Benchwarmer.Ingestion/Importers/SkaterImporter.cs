using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class SkaterImporter(
    IPlayerRepository playerRepository,
    ISkaterStatsRepository statsRepository,
    ILogger<SkaterImporter> logger)
{
    public async Task<int> ImportAsync(IEnumerable<SkaterRecord> skaters)
    {
        var count = 0;

        // Group by player to upsert players first
        var playerGroups = skaters.GroupBy(s => s.PlayerId);

        foreach (var group in playerGroups)
        {
            var first = group.First();

            // Upsert player basic info via repository
            await playerRepository.UpsertBasicInfoAsync(first.PlayerId, first.Name, first.Team);

            // Collect all season stats for this player
            var seasonStats = group.Select(record => new SkaterSeason
            {
                PlayerId = record.PlayerId,
                Season = record.Season,
                Team = record.Team,
                Situation = record.Situation,
                GamesPlayed = record.GamesPlayed,
                IceTimeSeconds = (int)record.IceTime,
                Goals = (int)record.Goals,
                Assists = (int)(record.PrimaryAssists + record.SecondaryAssists),
                Shots = (int)record.Shots,
                ExpectedGoals = record.ExpectedGoals,
                CorsiForPct = record.CorsiPct,
                FenwickForPct = record.FenwickPct
            }).ToList();

            // Upsert stats via repository
            await statsRepository.UpsertBatchAsync(seasonStats);
            count += seasonStats.Count;
        }

        logger.LogInformation("Imported {Count} skater season records", count);
        return count;
    }
}
