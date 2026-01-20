using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface IGameRepository
{
    Task<Game?> GetByGameIdAsync(string gameId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Game>> GetByDateAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Game>> GetCompletedByDateAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<int> UpsertAsync(Game game, CancellationToken cancellationToken = default);
    Task<int> UpsertBatchAsync(IEnumerable<Game> games, CancellationToken cancellationToken = default);
}
