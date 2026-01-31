namespace Benchwarmer.Api.Dtos;

public record GoalieStatsDto(
    int Id,
    int PlayerId,
    int Season,
    string Team,
    string Situation,
    bool IsPlayoffs,
    int GamesPlayed,
    int IceTimeSeconds,
    int GoalsAgainst,
    int ShotsAgainst,
    decimal? SavePercentage,
    decimal? GoalsAgainstAverage,
    decimal? GoalsSavedAboveExpected,
    decimal? ExpectedGoalsAgainst,
    int LowDangerShots,
    int MediumDangerShots,
    int HighDangerShots,
    int LowDangerGoals,
    int MediumDangerGoals,
    int HighDangerGoals,
    // Rebound control fields
    decimal? ExpectedRebounds,
    int Rebounds
);

public record GoaliePlayerStatsDto(
    int PlayerId,
    string PlayerName,
    IReadOnlyList<GoalieStatsDto> Stats
);
