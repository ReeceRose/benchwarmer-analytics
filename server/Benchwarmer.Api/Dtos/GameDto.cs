namespace Benchwarmer.Api.Dtos;

public record YesterdaysGamesDto(
    DateOnly Date,
    IReadOnlyList<GameSummaryDto> Games
);

public record GameSummaryDto(
    string GameId,
    DateOnly GameDate,
    GameTeamDto Home,
    GameTeamDto Away,
    string? PeriodType,
    IReadOnlyList<GamePeriodStatsDto> Periods,
    bool HasShotData
);

public record GameTeamDto(
    string TeamCode,
    int Goals,
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
