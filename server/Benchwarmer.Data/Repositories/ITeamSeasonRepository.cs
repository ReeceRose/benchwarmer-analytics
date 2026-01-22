using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ITeamSeasonRepository
{
    Task<IReadOnlyList<TeamSeason>> GetBySeasonAsync(int season, string situation = "all", bool isPlayoffs = false, CancellationToken cancellationToken = default);
    Task<TeamSeason?> GetByTeamSeasonAsync(string teamAbbrev, int season, string situation = "all", bool isPlayoffs = false, CancellationToken cancellationToken = default);
}
