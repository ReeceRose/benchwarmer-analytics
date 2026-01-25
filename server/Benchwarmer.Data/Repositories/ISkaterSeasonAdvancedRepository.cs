using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ISkaterSeasonAdvancedRepository
{
    Task UpsertBatchAsync(IEnumerable<SkaterSeasonAdvanced> stats, CancellationToken cancellationToken = default);
}

