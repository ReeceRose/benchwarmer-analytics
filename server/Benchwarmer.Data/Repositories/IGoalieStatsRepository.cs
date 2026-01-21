using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface IGoalieStatsRepository
{
    Task<IReadOnlyList<GoalieSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GoalieSeason>> GetByTeamSeasonAsync(
        string teamAbbrev,
        int season,
        string situation = "all",
        bool? isPlayoffs = null,
        CancellationToken cancellationToken = default);

    Task UpsertBatchAsync(IEnumerable<GoalieSeason> stats, CancellationToken cancellationToken = default);
}
