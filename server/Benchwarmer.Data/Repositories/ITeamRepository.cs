using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ITeamRepository
{
    Task<IReadOnlyList<Team>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Team?> GetByAbbrevAsync(string abbrev, CancellationToken cancellationToken = default);
    Task<Team> UpsertAsync(Team team, CancellationToken cancellationToken = default);
}
