using Benchwarmer.Api.Dtos;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for building leaderboard DTOs.
/// </summary>
public static class LeaderboardBuilder
{
    public static LeaderboardResponseDto BuildResponse(
        LeaderboardResult result,
        int season,
        string situation)
    {
        var entries = result.Entries.Select(e => new LeaderboardEntryDto(
            Rank: e.Rank,
            PlayerId: e.PlayerId,
            Name: e.Name,
            Team: e.Team,
            Position: e.Position,
            PrimaryValue: e.PrimaryValue,
            GamesPlayed: e.GamesPlayed,
            Goals: e.Goals,
            Assists: e.Assists,
            ExpectedGoals: e.ExpectedGoals,
            CorsiForPct: e.CorsiForPct,
            IceTimeSeconds: e.IceTimeSeconds,
            SavePercentage: e.SavePercentage,
            GoalsAgainstAverage: e.GoalsAgainstAverage,
            GoalsSavedAboveExpected: e.GoalsSavedAboveExpected,
            ShotsAgainst: e.ShotsAgainst
        )).ToList();

        return new LeaderboardResponseDto(
            Category: result.Category,
            Season: season,
            Situation: situation,
            TotalCount: result.TotalCount,
            Entries: entries
        );
    }

    /// <summary>
    /// Validates the category parameter.
    /// </summary>
    public static bool IsValidCategory(string category) =>
        LeaderboardCategories.IsValid(category);

    /// <summary>
    /// Checks if the category is a goalie stat.
    /// </summary>
    public static bool IsGoalieCategory(string category) =>
        LeaderboardCategories.IsGoalieCategory(category);
}
