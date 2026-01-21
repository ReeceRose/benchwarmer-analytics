using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class GoalieImporter(
    IPlayerRepository playerRepository,
    IGoalieStatsRepository statsRepository,
    ILogger<GoalieImporter> logger)
{
    public async Task<int> ImportAsync(IEnumerable<GoalieRecord> goalies, bool isPlayoffs = false)
    {
        var count = 0;

        // Group by player to upsert players first
        var playerGroups = goalies.GroupBy(g => g.PlayerId);

        foreach (var group in playerGroups)
        {
            var first = group.First();
            var normalizedTeam = TeamAbbreviationNormalizer.Normalize(first.Team);

            // Upsert player basic info via repository (with position = "G" for goalies)
            await playerRepository.UpsertBasicInfoAsync(first.PlayerId, first.Name, normalizedTeam, "G");

            // Collect all season stats for this player
            var seasonStats = group.Select(record =>
            {
                var iceTimeSeconds = (int)record.IceTime;
                var goalsAgainst = (int)(record.GoalsAgainst ?? 0);
                var shotsAgainst = (int)(record.ShotsAgainst ?? 0);
                var xGoalsAgainst = record.ExpectedGoalsAgainst;

                // Calculate derived stats
                decimal? savePercentage = shotsAgainst > 0
                    ? (decimal)(shotsAgainst - goalsAgainst) / shotsAgainst
                    : null;

                decimal? goalsAgainstAverage = iceTimeSeconds > 0
                    ? (decimal)goalsAgainst / ((decimal)iceTimeSeconds / 3600m)
                    : null;

                decimal? goalsSavedAboveExpected = xGoalsAgainst.HasValue
                    ? xGoalsAgainst.Value - goalsAgainst
                    : null;

                return new GoalieSeason
                {
                    PlayerId = record.PlayerId,
                    Season = record.Season,
                    Team = TeamAbbreviationNormalizer.Normalize(record.Team),
                    Situation = record.Situation,
                    IsPlayoffs = isPlayoffs,
                    GamesPlayed = record.GamesPlayed,
                    IceTimeSeconds = iceTimeSeconds,
                    GoalsAgainst = goalsAgainst,
                    ShotsAgainst = shotsAgainst,
                    ExpectedGoalsAgainst = xGoalsAgainst,
                    SavePercentage = savePercentage,
                    GoalsAgainstAverage = goalsAgainstAverage,
                    GoalsSavedAboveExpected = goalsSavedAboveExpected,
                    LowDangerShots = (int)(record.LowDangerShots ?? 0),
                    MediumDangerShots = (int)(record.MediumDangerShots ?? 0),
                    HighDangerShots = (int)(record.HighDangerShots ?? 0),
                    LowDangerGoals = (int)(record.LowDangerGoals ?? 0),
                    MediumDangerGoals = (int)(record.MediumDangerGoals ?? 0),
                    HighDangerGoals = (int)(record.HighDangerGoals ?? 0),
                    ExpectedRebounds = record.ExpectedRebounds,
                    Rebounds = (int)(record.Rebounds ?? 0)
                };
            }).ToList();

            // Upsert stats via repository
            await statsRepository.UpsertBatchAsync(seasonStats);
            count += seasonStats.Count;
        }

        logger.LogInformation("Imported {Count} goalie {SeasonType} records", count, isPlayoffs ? "playoffs" : "regular season");
        return count;
    }
}
