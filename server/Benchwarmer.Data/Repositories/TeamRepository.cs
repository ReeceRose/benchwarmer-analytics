using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class TeamRepository(IDbContextFactory<AppDbContext> dbFactory) : ITeamRepository
{
    public async Task<IReadOnlyList<Team>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.Teams
            .OrderBy(t => t.IsActive ? 0 : 1)
            .ThenBy(t => t.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Team?> GetByAbbrevAsync(string abbrev, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.Teams
            .FirstOrDefaultAsync(t => t.Abbreviation == abbrev, cancellationToken);
    }

    public async Task<Team> UpsertAsync(Team team, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var existing = await db.Teams
            .FirstOrDefaultAsync(t => t.Abbreviation == team.Abbreviation, cancellationToken);

        if (existing is null)
        {
            team.CreatedAt = DateTime.UtcNow;
            team.UpdatedAt = DateTime.UtcNow;
            db.Teams.Add(team);
        }
        else
        {
            existing.Name = team.Name;
            existing.Division = team.Division;
            existing.Conference = team.Conference;
            existing.IsActive = team.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;
            team = existing;
        }

        await db.SaveChangesAsync(cancellationToken);
        return team;
    }
}
