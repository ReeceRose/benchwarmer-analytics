namespace Benchwarmer.Api.Dtos;

public record SkaterStatsDto(
    int Id,
    int PlayerId,
    int Season,
    string Team,
    string Situation,
    int GamesPlayed,
    int IceTimeSeconds,
    int Goals,
    int Assists,
    int Points,
    int Shots,
    decimal? ExpectedGoals,
    decimal? ExpectedGoalsPer60,
    decimal? OnIceShootingPct,
    decimal? OnIceSavePct,
    decimal? CorsiForPct,
    decimal? FenwickForPct
);

public record PlayerStatsDto(
    int PlayerId,
    string PlayerName,
    IReadOnlyList<SkaterStatsDto> Stats
);
