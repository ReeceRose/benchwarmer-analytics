using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface IPlayerRepository
{
    Task<Player?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Player>> GetByTeamAsync(string teamAbbrev, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Player> Players, int TotalCount)> SearchAsync(
        string query,
        int? page = null,
        int? pageSize = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Upserts basic player info (name, team) without overwriting bio data.
    /// Used by SkaterImporter when we don't have full bio info.
    /// </summary>
    Task UpsertBasicInfoAsync(int playerId, string name, string? teamAbbrev, CancellationToken cancellationToken = default);

    /// <summary>
    /// Upserts full player data including bio fields.
    /// Used by PlayerBioImporter when we have complete player info.
    /// </summary>
    Task UpsertBatchAsync(IEnumerable<Player> players, CancellationToken cancellationToken = default);
}
