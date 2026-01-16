using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class PlayerRepository(AppDbContext db) : IPlayerRepository
{
    public async Task<Player?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.Players.FindAsync([id], cancellationToken);
    }

    public async Task<IReadOnlyList<Player>> GetByTeamAsync(string teamAbbrev, CancellationToken cancellationToken = default)
    {
        return await db.Players
            .Where(p => p.CurrentTeamAbbreviation == teamAbbrev)
            .OrderBy(p => p.Position)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Player> Players, int TotalCount)> SearchAsync(
        string query,
        int? page = null,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedQuery = query.ToLowerInvariant();

        var baseQuery = db.Players
            .Where(p => p.Name.ToLower().Contains(normalizedQuery) ||
                       (p.FirstName != null && p.FirstName.ToLower().Contains(normalizedQuery)) ||
                       (p.LastName != null && p.LastName.ToLower().Contains(normalizedQuery)));

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var resultQuery = baseQuery.OrderBy(p => p.Name);

        if (page.HasValue && pageSize.HasValue)
        {
            var skip = (page.Value - 1) * pageSize.Value;
            resultQuery = (IOrderedQueryable<Player>)resultQuery.Skip(skip).Take(pageSize.Value);
        }
        else
        {
            // Default limit if no pagination
            resultQuery = (IOrderedQueryable<Player>)resultQuery.Take(50);
        }

        var players = await resultQuery.ToListAsync(cancellationToken);
        return (players, totalCount);
    }

    public async Task UpsertBasicInfoAsync(int playerId, string name, string? teamAbbrev, CancellationToken cancellationToken = default)
    {
        var existing = await db.Players.FindAsync([playerId], cancellationToken);

        if (existing is null)
        {
            var player = new Player
            {
                Id = playerId,
                Name = name,
                CurrentTeamAbbreviation = teamAbbrev,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Players.Add(player);
        }
        else
        {
            existing.Name = name;
            existing.CurrentTeamAbbreviation = teamAbbrev;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertBatchAsync(IEnumerable<Player> players, CancellationToken cancellationToken = default)
    {
        foreach (var player in players)
        {
            var existing = await db.Players.FindAsync([player.Id], cancellationToken);

            if (existing is null)
            {
                player.CreatedAt = DateTime.UtcNow;
                player.UpdatedAt = DateTime.UtcNow;
                db.Players.Add(player);
            }
            else
            {
                existing.Name = player.Name;
                existing.FirstName = player.FirstName;
                existing.LastName = player.LastName;
                existing.Position = player.Position;
                existing.CurrentTeamAbbreviation = player.CurrentTeamAbbreviation;
                existing.HeadshotUrl = player.HeadshotUrl;
                existing.BirthDate = player.BirthDate;
                existing.HeightInches = player.HeightInches;
                existing.WeightLbs = player.WeightLbs;
                existing.Shoots = player.Shoots;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
