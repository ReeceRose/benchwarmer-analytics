using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface IShotRepository
{
    Task<int> UpsertBatchAsync(IEnumerable<Shot> shots, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Shot>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        int? period = null,
        string? shotType = null,
        bool? goalsOnly = null,
        int? limit = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Shot>> GetByGameAsync(string gameId, CancellationToken cancellationToken = default);
    Task<int> GetCountBySeasonAsync(int season, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Shot>> GetByTeamAsync(
        string teamCode,
        int season,
        bool? isPlayoffs = null,
        int? period = null,
        string? shotType = null,
        int? shooterPlayerId = null,
        int? limit = null,
        CancellationToken cancellationToken = default);
}
