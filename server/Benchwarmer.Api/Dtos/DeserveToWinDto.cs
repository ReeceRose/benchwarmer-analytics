namespace Benchwarmer.Api.Dtos;

public record DeserveToWinResponseDto(
    string GameId,
    string HomeTeamCode,
    string AwayTeamCode,
    int HomeGoals,
    int AwayGoals,
    DeserveToWinSummaryDto HomeSummary,
    DeserveToWinSummaryDto AwaySummary,
    IReadOnlyList<DeserveToWinPointDto> Progression
);

public record DeserveToWinSummaryDto(
    decimal TotalXG,
    decimal PoissonWinPct,
    decimal MonteCarloWinPct,
    decimal MonteCarloOTWinPct,
    int ShotsExcludingEmptyNet
);

public record DeserveToWinPointDto(
    int ShotNumber,
    int GameTimeSeconds,
    int Period,
    bool IsHomeShot,
    decimal ShotXG,
    decimal HomeXGCumulative,
    decimal AwayXGCumulative,
    decimal HomePoissonWinPct,
    decimal HomeMonteCarloWinPct,
    bool? WasGoal,
    bool IsRebound
);
