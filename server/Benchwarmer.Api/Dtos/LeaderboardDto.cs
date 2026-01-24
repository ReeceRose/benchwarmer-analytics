namespace Benchwarmer.Api.Dtos;

public record LeaderboardResponseDto(
    string Category,
    int Season,
    string Situation,
    int TotalCount,
    IReadOnlyList<LeaderboardEntryDto> Entries
);

public record LeaderboardEntryDto(
    int Rank,
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    decimal PrimaryValue,
    int GamesPlayed,
    // Skater secondary stats
    int? Goals,
    int? Assists,
    int? Shots,
    decimal? ExpectedGoals,
    decimal? ExpectedGoalsPer60,
    decimal? CorsiForPct,
    decimal? FenwickForPct,
    decimal? OnIceShootingPct,
    decimal? OnIceSavePct,
    int? IceTimeSeconds,
    // Goalie secondary stats
    decimal? SavePercentage,
    decimal? GoalsAgainstAverage,
    decimal? GoalsSavedAboveExpected,
    int? ShotsAgainst,
    int? GoalieIceTimeSeconds,
    int? GoalsAgainst,
    decimal? ExpectedGoalsAgainst,
    int? HighDangerShots,
    int? HighDangerGoals,
    int? MediumDangerShots,
    int? MediumDangerGoals,
    int? LowDangerShots,
    int? LowDangerGoals,
    int? Rebounds,
    decimal? ExpectedRebounds
);
