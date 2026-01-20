using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ISkaterStatsRepository
{
    Task<IReadOnlyList<SkaterSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkaterSeason>> GetByTeamSeasonAsync(
        string teamAbbrev,
        int season,
        string situation = "all",
        bool? isPlayoffs = null,
        CancellationToken cancellationToken = default);

    Task UpsertBatchAsync(IEnumerable<SkaterSeason> stats, CancellationToken cancellationToken = default);
}
