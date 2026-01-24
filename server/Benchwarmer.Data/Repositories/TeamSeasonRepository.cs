using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class TeamSeasonRepository(IDbContextFactory<AppDbContext> dbFactory) : ITeamSeasonRepository
{
    public async Task<IReadOnlyList<TeamSeason>> GetBySeasonAsync(int season, string situation = "all", bool isPlayoffs = false, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.TeamSeasons
            .Where(ts => ts.Season == season && ts.Situation == situation && ts.IsPlayoffs == isPlayoffs)
            .Include(ts => ts.Team)
            .OrderByDescending(ts => ts.XGoalsPercentage)
            .ToListAsync(cancellationToken);
    }

    public async Task<TeamSeason?> GetByTeamSeasonAsync(string teamAbbrev, int season, string situation = "all", bool isPlayoffs = false, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.TeamSeasons
            .Where(ts => ts.TeamAbbreviation == teamAbbrev && ts.Season == season && ts.Situation == situation && ts.IsPlayoffs == isPlayoffs)
            .Include(ts => ts.Team)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
