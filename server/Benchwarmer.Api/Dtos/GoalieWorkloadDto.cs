namespace Benchwarmer.Api.Dtos;

public record GoalieGameStatsDto(
    string GameId,
    DateOnly GameDate,
    string Opponent,
    bool IsHome,
    int ShotsAgainst,
    int GoalsAgainst,
    decimal SavePercentage,
    decimal ExpectedGoalsAgainst,
    decimal GoalsSavedAboveExpected,
    bool IsBackToBack,
    int? DaysSincePreviousGame
);

public record WorkloadWindowDto(
    int Days,
    int GamesPlayed,
    decimal GamesPerWeek,
    int TotalShotsAgainst,
    decimal AvgShotsAgainstPerGame,
    decimal AvgSavePercentage,
    decimal TotalGSAx,
    bool IsHighWorkload
);

public record BackToBackSplitsDto(
    int BackToBackGames,
    int NonBackToBackGames,
    decimal BackToBackSavePercentage,
    decimal NonBackToBackSavePercentage,
    decimal BackToBackGAA,
    decimal NonBackToBackGAA,
    decimal BackToBackGSAx,
    decimal NonBackToBackGSAx
);

public record GoalieWorkloadResponseDto(
    int PlayerId,
    string PlayerName,
    int Season,
    int GamesIncluded,
    IReadOnlyList<GoalieGameStatsDto> Games,
    WorkloadWindowDto Last7Days,
    WorkloadWindowDto Last14Days,
    WorkloadWindowDto Last30Days,
    BackToBackSplitsDto BackToBackSplits,
    string WorkloadTrend
);
