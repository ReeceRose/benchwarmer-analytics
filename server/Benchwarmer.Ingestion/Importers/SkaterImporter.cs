using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.Extensions.Logging;
using System.Reflection;

namespace Benchwarmer.Ingestion.Importers;

public class SkaterImporter(
    IPlayerRepository playerRepository,
    ISkaterStatsRepository statsRepository,
    ISkaterSeasonAdvancedRepository advancedRepository,
    ILogger<SkaterImporter> logger)
{
    private static readonly (PropertyInfo RecordProp, PropertyInfo AdvancedProp)[] AdvancedPropertyMap = BuildAdvancedPropertyMap();

    public async Task<int> ImportAsync(IEnumerable<SkaterRecord> skaters, bool isPlayoffs = false)
    {
        var count = 0;

        // Group by player to upsert players first
        var playerGroups = skaters.GroupBy(s => s.PlayerId);

        foreach (var group in playerGroups)
        {
            var first = group.First();
            var normalizedTeam = TeamAbbreviationNormalizer.Normalize(first.Team);
            var normalizedPosition = NormalizePosition(first.Position);

            // Upsert player basic info via repository
            await playerRepository.UpsertBasicInfoAsync(first.PlayerId, first.Name, normalizedTeam, normalizedPosition);

            // Collect all season stats for this player
            var seasonStats = group.Select(record =>
            {
                var iceTimeSeconds = (int)record.IceTime;

                return new SkaterSeason
                {
                    PlayerId = record.PlayerId,
                    Season = record.Season,
                    Team = TeamAbbreviationNormalizer.Normalize(record.Team),
                    Situation = record.Situation,
                    IsPlayoffs = isPlayoffs,
                    GamesPlayed = record.GamesPlayed,
                    IceTimeSeconds = iceTimeSeconds,
                    Goals = (int)record.Goals,
                    Assists = (int)(record.PrimaryAssists + record.SecondaryAssists),
                    Shots = (int)record.Shots,
                    ExpectedGoals = record.ExpectedGoals,
                    ExpectedGoalsPer60 = CalculatePer60(record.ExpectedGoals, iceTimeSeconds),
                    OnIceShootingPct = CalculateShootingPct(record.OnIceGoalsFor, record.OnIceShotsOnGoalFor),
                    OnIceSavePct = CalculateSavePct(record.OnIceGoalsAgainst, record.OnIceShotsOnGoalAgainst),
                    CorsiForPct = record.CorsiPct,
                    FenwickForPct = record.FenwickPct
                };
            }).ToList();

            // Collect all advanced stats for this player (everything not stored on SkaterSeason)
            var advancedStats = group.Select(record =>
            {
                var advanced = new SkaterSeasonAdvanced
                {
                    PlayerId = record.PlayerId,
                    Season = record.Season,
                    Team = TeamAbbreviationNormalizer.Normalize(record.Team),
                    Situation = record.Situation,
                    IsPlayoffs = isPlayoffs
                };

                foreach (var (recordProp, advancedProp) in AdvancedPropertyMap)
                {
                    advancedProp.SetValue(advanced, recordProp.GetValue(record));
                }

                return advanced;
            }).ToList();

            // Upsert stats via repository
            await statsRepository.UpsertBatchAsync(seasonStats);
            await advancedRepository.UpsertBatchAsync(advancedStats);
            count += seasonStats.Count;
        }

        logger.LogInformation("Imported {Count} skater {SeasonType} records", count, isPlayoffs ? "playoffs" : "regular season");
        return count;
    }

    private static (PropertyInfo RecordProp, PropertyInfo AdvancedProp)[] BuildAdvancedPropertyMap()
    {
        var recordProps = typeof(SkaterRecord)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead)
            .ToDictionary(p => p.Name, StringComparer.Ordinal);

        var advancedProps = typeof(SkaterSeasonAdvanced)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanWrite)
            .Where(p =>
                p.Name is not nameof(SkaterSeasonAdvanced.Id) and
                         not nameof(SkaterSeasonAdvanced.PlayerId) and
                         not nameof(SkaterSeasonAdvanced.Season) and
                         not nameof(SkaterSeasonAdvanced.Team) and
                         not nameof(SkaterSeasonAdvanced.Situation) and
                         not nameof(SkaterSeasonAdvanced.IsPlayoffs) and
                         not nameof(SkaterSeasonAdvanced.Player))
            .ToList();

        var map = new List<(PropertyInfo, PropertyInfo)>(advancedProps.Count);

        foreach (var adv in advancedProps)
        {
            if (!recordProps.TryGetValue(adv.Name, out var rec))
            {
                continue;
            }

            if (!adv.PropertyType.IsAssignableFrom(rec.PropertyType))
            {
                continue;
            }

            map.Add((rec, adv));
        }

        return map.ToArray();
    }

    private static string? NormalizePosition(string? position)
    {
        if (string.IsNullOrWhiteSpace(position))
        {
            return null;
        }

        return position.Trim().ToUpperInvariant() switch
        {
            "L" => "LW",
            "R" => "RW",
            "C" => "C",
            "D" => "D",
            "G" => "G",
            _ => position.Trim().ToUpperInvariant()
        };
    }

    private static decimal? CalculatePer60(decimal? value, int iceTimeSeconds)
    {
        if (!value.HasValue || iceTimeSeconds <= 0)
        {
            return null;
        }

        // value / seconds * 3600 = per-60 rate (since 60 minutes = 3600 seconds)
        return Math.Round(value.Value / iceTimeSeconds * 3600m, 3);
    }

    private static decimal? CalculateShootingPct(decimal? goalsFor, decimal? shotsOnGoalFor)
    {
        if (!goalsFor.HasValue || !shotsOnGoalFor.HasValue || shotsOnGoalFor.Value <= 0)
        {
            return null;
        }

        var pct = goalsFor.Value / shotsOnGoalFor.Value;
        return Clamp01(Math.Round(pct, 4));
    }

    private static decimal? CalculateSavePct(decimal? goalsAgainst, decimal? shotsOnGoalAgainst)
    {
        if (!goalsAgainst.HasValue || !shotsOnGoalAgainst.HasValue || shotsOnGoalAgainst.Value <= 0)
        {
            return null;
        }

        var pct = (shotsOnGoalAgainst.Value - goalsAgainst.Value) / shotsOnGoalAgainst.Value;
        return Clamp01(Math.Round(pct, 4));
    }

    private static decimal Clamp01(decimal value)
    {
        if (value < 0m) return 0m;
        if (value > 1m) return 1m;
        return value;
    }
}
