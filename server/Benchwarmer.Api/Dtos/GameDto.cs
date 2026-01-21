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
    bool HasShotData,
    // Live game fields
    int? CurrentPeriod = null,
    string? TimeRemaining = null,
    bool? InIntermission = null,
    IReadOnlyList<GameGoalDto>? Goals = null
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
    decimal? AvgShotDistance,
    // Live game fields
    string? Record = null
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

public record GameShotsResponseDto(
    string GameId,
    string HomeTeamCode,
    string AwayTeamCode,
    IReadOnlyList<GameShotDto> HomeShots,
    IReadOnlyList<GameShotDto> AwayShots
);

public record GameShotDto(
    int Period,
    int GameSeconds,
    string? ShooterName,
    int? ShooterPlayerId,
    decimal XCoord,
    decimal YCoord,
    decimal XGoal,
    bool IsGoal,
    bool ShotWasOnGoal,
    string? ShotType,
    decimal ShotDistance,
    decimal ShotAngle
);

public record GameBoxscoreResponseDto(
    string GameId,
    string HomeTeamCode,
    string AwayTeamCode,
    IReadOnlyList<BoxscoreSkaterDto> HomeSkaters,
    IReadOnlyList<BoxscoreSkaterDto> AwaySkaters,
    IReadOnlyList<BoxscoreGoalieDto> HomeGoalies,
    IReadOnlyList<BoxscoreGoalieDto> AwayGoalies
);

public record BoxscoreSkaterDto(
    int PlayerId,
    int JerseyNumber,
    string Name,
    string Position,
    int Goals,
    int Assists,
    int Points,
    int PlusMinus,
    int PenaltyMinutes,
    int Hits,
    int ShotsOnGoal,
    int BlockedShots,
    int Giveaways,
    int Takeaways,
    string TimeOnIce,
    int Shifts,
    decimal FaceoffPct
);

public record BoxscoreGoalieDto(
    int PlayerId,
    int JerseyNumber,
    string Name,
    int ShotsAgainst,
    int Saves,
    int GoalsAgainst,
    decimal? SavePct,
    string TimeOnIce,
    bool Starter,
    string? Decision
);

public record GameGoalDto(
    int Period,
    string TimeInPeriod,
    string ScorerName,
    int ScorerId,
    string TeamCode,
    string? Strength,
    IReadOnlyList<string> Assists
);
