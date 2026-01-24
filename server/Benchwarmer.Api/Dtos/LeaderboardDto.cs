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
    decimal? ExpectedGoals,
    decimal? CorsiForPct,
    int? IceTimeSeconds,
    // Goalie secondary stats
    decimal? SavePercentage,
    decimal? GoalsAgainstAverage,
    decimal? GoalsSavedAboveExpected,
    int? ShotsAgainst
);
