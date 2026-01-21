using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class GameRepository(AppDbContext db) : IGameRepository
{
    public async Task<Game?> GetByGameIdAsync(string gameId, CancellationToken cancellationToken = default)
    {
        return await db.Games
            .FirstOrDefaultAsync(g => g.GameId == gameId, cancellationToken);
    }

    public async Task<IReadOnlyList<Game>> GetByDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        return await db.Games
            .Where(g => g.GameDate == date)
            .OrderBy(g => g.GameId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Game>> GetCompletedByDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        return await db.Games
            .Where(g => g.GameDate == date && g.GameState == "OFF")
            .OrderBy(g => g.GameId)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> UpsertAsync(Game game, CancellationToken cancellationToken = default)
    {
        var existing = await db.Games
            .FirstOrDefaultAsync(g => g.GameId == game.GameId, cancellationToken);

        if (existing is null)
        {
            game.CreatedAt = DateTime.UtcNow;
            game.UpdatedAt = DateTime.UtcNow;
            db.Games.Add(game);
        }
        else
        {
            existing.Season = game.Season;
            existing.GameType = game.GameType;
            existing.GameDate = game.GameDate;
            existing.StartTimeUtc = game.StartTimeUtc;
            existing.HomeTeamCode = game.HomeTeamCode;
            existing.AwayTeamCode = game.AwayTeamCode;
            existing.HomeScore = game.HomeScore;
            existing.AwayScore = game.AwayScore;
            existing.GameState = game.GameState;
            existing.PeriodType = game.PeriodType;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        return await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> UpsertBatchAsync(IEnumerable<Game> games, CancellationToken cancellationToken = default)
    {
        var gameList = games.ToList();
        if (gameList.Count == 0) return 0;

        var gameIds = gameList.Select(g => g.GameId).ToHashSet();
        var existingGames = await db.Games
            .Where(g => gameIds.Contains(g.GameId))
            .ToDictionaryAsync(g => g.GameId, cancellationToken);

        var now = DateTime.UtcNow;

        foreach (var game in gameList)
        {
            if (existingGames.TryGetValue(game.GameId, out var existing))
            {
                existing.Season = game.Season;
                existing.GameType = game.GameType;
                existing.GameDate = game.GameDate;
                existing.StartTimeUtc = game.StartTimeUtc;
                existing.HomeTeamCode = game.HomeTeamCode;
                existing.AwayTeamCode = game.AwayTeamCode;
                existing.HomeScore = game.HomeScore;
                existing.AwayScore = game.AwayScore;
                existing.GameState = game.GameState;
                existing.PeriodType = game.PeriodType;
                existing.UpdatedAt = now;
            }
            else
            {
                game.CreatedAt = now;
                game.UpdatedAt = now;
                db.Games.Add(game);
            }
        }

        return await db.SaveChangesAsync(cancellationToken);
    }
}
