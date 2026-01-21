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

    public async Task<IReadOnlyList<Player>> GetByTeamAndSeasonAsync(string teamAbbrev, int season, bool? isPlayoffs = null, CancellationToken cancellationToken = default)
    {
        // Get player IDs who played for this team during this season from SkaterSeasons
        var query = db.SkaterSeasons
            .Where(s => s.Team == teamAbbrev && s.Season == season && s.Situation == "all");

        if (isPlayoffs.HasValue)
        {
            query = query.Where(s => s.IsPlayoffs == isPlayoffs.Value);
        }

        var playerIds = await query
            .Select(s => s.PlayerId)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Fetch full player details
        return await db.Players
            .Where(p => playerIds.Contains(p.Id))
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

    public async Task UpsertBasicInfoAsync(int playerId, string name, string? teamAbbrev, string? position = null, CancellationToken cancellationToken = default)
    {
        var existing = await db.Players.FindAsync([playerId], cancellationToken);

        if (existing is null)
        {
            var player = new Player
            {
                Id = playerId,
                Name = name,
                CurrentTeamAbbreviation = teamAbbrev,
                Position = position,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Players.Add(player);
        }
        else
        {
            existing.Name = name;
            existing.CurrentTeamAbbreviation = teamAbbrev;
            // Only update position if provided (don't overwrite existing position with null)
            if (position != null)
            {
                existing.Position = position;
            }
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertBatchAsync(IEnumerable<Player> players, CancellationToken cancellationToken = default)
    {
        var playersList = players.ToList();
        if (playersList.Count == 0) return;

        // Batch fetch all existing players by ID in a single query
        var playerIds = playersList.Select(p => p.Id).Distinct().ToList();
        var existingRecords = await db.Players
            .Where(p => playerIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        // Build dictionary for O(1) lookup
        var existingLookup = existingRecords.ToDictionary(p => p.Id);

        var now = DateTime.UtcNow;

        foreach (var player in playersList)
        {
            if (existingLookup.TryGetValue(player.Id, out var existing))
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
                existing.UpdatedAt = now;
            }
            else
            {
                player.CreatedAt = now;
                player.UpdatedAt = now;
                db.Players.Add(player);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
