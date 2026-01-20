namespace Benchwarmer.Api.Dtos;

public record ShotDto(
    string ShotId,
    int? ShooterPlayerId,
    string? ShooterName,
    string? ShooterPosition,
    int Period,
    int GameTimeSeconds,
    decimal? ArenaAdjustedXCoord,
    decimal? ArenaAdjustedYCoord,
    decimal? ShotDistance,
    decimal? ShotAngle,
    string? ShotType,
    bool IsGoal,
    bool ShotWasOnGoal,
    bool ShotOnEmptyNet,
    bool ShotRebound,
    bool ShotRush,
    decimal? XGoal,
    int HomeSkatersOnIce,
    int AwaySkatersOnIce,
    string GameId
);

public record ShotSummaryDto(
    int TotalShots,
    int Goals,
    int ShotsOnGoal,
    decimal ShootingPct,
    decimal TotalXGoal,
    decimal GoalsAboveExpected,
    int HighDangerShots,
    int MediumDangerShots,
    int LowDangerShots
);

public record TeamShotsResponseDto(
    string TeamAbbrev,
    int Season,
    bool? IsPlayoffs,
    IReadOnlyList<ShotDto> Shots,
    ShotSummaryDto Summary
);

public record ShooterStatsDto(
    int PlayerId,
    string PlayerName,
    string? Position,
    int Shots,
    int Goals,
    decimal ShootingPct,
    decimal TotalXGoal,
    decimal GoalsAboveExpected
);
