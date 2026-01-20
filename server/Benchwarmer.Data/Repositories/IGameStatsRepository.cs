using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface IGameStatsRepository
{
    Task<GameStats?> GetGameStatsAsync(string gameId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GameStats>> GetGameStatsBatchAsync(IEnumerable<string> gameIds, CancellationToken cancellationToken = default);
}

public record GameStats(
    string GameId,
    TeamStats HomeStats,
    TeamStats AwayStats,
    IReadOnlyList<PeriodStats> Periods
);

public record TeamStats(
    string TeamCode,
    int TotalShots,
    int ShotsOnGoal,
    int Goals,
    decimal ExpectedGoals,
    decimal GoalsVsXgDiff,
    decimal AvgShotDistance,
    decimal AvgShotAngle,
    int HighDangerChances,
    int MediumDangerChances,
    int LowDangerChances
);

public record PeriodStats(
    int Period,
    int HomeShots,
    int AwayShots,
    int HomeGoals,
    int AwayGoals,
    decimal HomeXG,
    decimal AwayXG
);
