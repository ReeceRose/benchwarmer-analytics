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
            Shots: e.Shots,
            ExpectedGoals: e.ExpectedGoals,
            ExpectedGoalsPer60: e.ExpectedGoalsPer60,
            CorsiForPct: e.CorsiForPct,
            FenwickForPct: e.FenwickForPct,
            OnIceShootingPct: e.OnIceShootingPct,
            OnIceSavePct: e.OnIceSavePct,
            IceTimeSeconds: e.IceTimeSeconds,
            SavePercentage: e.SavePercentage,
            GoalsAgainstAverage: e.GoalsAgainstAverage,
            GoalsSavedAboveExpected: e.GoalsSavedAboveExpected,
            ShotsAgainst: e.ShotsAgainst,
            GoalieIceTimeSeconds: e.GoalieIceTimeSeconds,
            GoalsAgainst: e.GoalsAgainst,
            ExpectedGoalsAgainst: e.ExpectedGoalsAgainst,
            HighDangerShots: e.HighDangerShots,
            HighDangerGoals: e.HighDangerGoals,
            MediumDangerShots: e.MediumDangerShots,
            MediumDangerGoals: e.MediumDangerGoals,
            LowDangerShots: e.LowDangerShots,
            LowDangerGoals: e.LowDangerGoals,
            Rebounds: e.Rebounds,
            ExpectedRebounds: e.ExpectedRebounds
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
