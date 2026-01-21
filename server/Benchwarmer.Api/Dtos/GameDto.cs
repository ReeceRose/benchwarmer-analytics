namespace Benchwarmer.Api.Dtos;

public record GamesResponseDto(
    DateOnly Date,
    IReadOnlyList<GameSummaryDto> Games
);

public record GameSummaryDto(
    string GameId,
    DateOnly GameDate,
    string? GameState,
    string? StartTimeUtc,
    GameTeamDto Home,
    GameTeamDto Away,
    string? PeriodType,
    IReadOnlyList<GamePeriodStatsDto> Periods,
    bool HasShotData
);

public record GameTeamDto(
    string TeamCode,
    string? TeamName,
    int? Goals,
    int? Shots,
    int? ShotsOnGoal,
    decimal? ExpectedGoals,
    decimal? GoalsVsXgDiff,
    int? HighDangerChances,
    int? MediumDangerChances,
    int? LowDangerChances,
    decimal? AvgShotDistance
);

public record GamePeriodStatsDto(
    int Period,
    int HomeShots,
    int AwayShots,
    int HomeGoals,
    int AwayGoals,
    decimal HomeXG,
    decimal AwayXG
);
