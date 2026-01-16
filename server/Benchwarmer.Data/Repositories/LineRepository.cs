using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class LineRepository(AppDbContext db) : ILineRepository
{
    public async Task<(IReadOnlyList<LineCombination> Lines, int TotalCount)> GetByTeamAsync(
        string teamAbbrev,
        int season,
        string? situation = null,
        string? lineType = null,
        int minToiSeconds = 0,
        string? sortBy = null,
        bool sortDescending = true,
        int? page = null,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.LineCombinations
            .Include(l => l.Player1)
            .Include(l => l.Player2)
            .Include(l => l.Player3)
            .Where(l => l.Team == teamAbbrev && l.Season == season);

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(l => l.Situation == situation);
        }

        if (!string.IsNullOrEmpty(lineType))
        {
            query = lineType.ToLowerInvariant() switch
            {
                "forward" => query.Where(l => l.Player3Id != null),
                "defense" => query.Where(l => l.Player3Id == null),
                _ => query
            };
        }

        if (minToiSeconds > 0)
        {
            query = query.Where(l => l.IceTimeSeconds >= minToiSeconds);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = ApplySorting(query, sortBy, sortDescending);

        // Apply pagination
        if (page.HasValue && pageSize.HasValue)
        {
            var skip = (page.Value - 1) * pageSize.Value;
            query = query.Skip(skip).Take(pageSize.Value);
        }

        var lines = await query.ToListAsync(cancellationToken);
        return (lines, totalCount);
    }

    private static IQueryable<LineCombination> ApplySorting(
        IQueryable<LineCombination> query,
        string? sortBy,
        bool descending)
    {
        return (sortBy?.ToLowerInvariant()) switch
        {
            "toi" or "icetime" => descending
                ? query.OrderByDescending(l => l.IceTimeSeconds)
                : query.OrderBy(l => l.IceTimeSeconds),
            "gp" or "gamesplayed" => descending
                ? query.OrderByDescending(l => l.GamesPlayed)
                : query.OrderBy(l => l.GamesPlayed),
            "gf" or "goalsfor" => descending
                ? query.OrderByDescending(l => l.GoalsFor)
                : query.OrderBy(l => l.GoalsFor),
            "ga" or "goalsagainst" => descending
                ? query.OrderByDescending(l => l.GoalsAgainst)
                : query.OrderBy(l => l.GoalsAgainst),
            "xgf" or "xgoalsfor" => descending
                ? query.OrderByDescending(l => l.ExpectedGoalsFor)
                : query.OrderBy(l => l.ExpectedGoalsFor),
            "xgpct" or "xgoalspct" => descending
                ? query.OrderByDescending(l => l.ExpectedGoalsPct)
                : query.OrderBy(l => l.ExpectedGoalsPct),
            "cf" or "corsifor" => descending
                ? query.OrderByDescending(l => l.CorsiFor)
                : query.OrderBy(l => l.CorsiFor),
            "cfpct" or "corsipct" => descending
                ? query.OrderByDescending(l => l.CorsiPct)
                : query.OrderBy(l => l.CorsiPct),
            _ => descending
                ? query.OrderByDescending(l => l.IceTimeSeconds)
                : query.OrderBy(l => l.IceTimeSeconds)
        };
    }

    public async Task<IReadOnlyList<ChemistryPair>> GetChemistryMatrixAsync(
        string teamAbbrev,
        int season,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.LineCombinations
            .Include(l => l.Player1)
            .Include(l => l.Player2)
            .Where(l => l.Team == teamAbbrev && l.Season == season);

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(l => l.Situation == situation);
        }

        // Get all line combinations and aggregate player pairs
        var lines = await query.ToListAsync(cancellationToken);

        // Build a dictionary of player pairs with aggregated stats
        var pairStats = new Dictionary<(int, int), ChemistryPairBuilder>();

        foreach (var line in lines)
        {
            // Add Player1-Player2 pair
            AddPair(pairStats, line.Player1Id, line.Player1?.Name ?? "Unknown",
                line.Player2Id, line.Player2?.Name ?? "Unknown", line);

            // If it's a forward line, also add Player1-Player3 and Player2-Player3 pairs
            if (line.Player3Id.HasValue && line.Player3 != null)
            {
                AddPair(pairStats, line.Player1Id, line.Player1?.Name ?? "Unknown",
                    line.Player3Id.Value, line.Player3.Name, line);
                AddPair(pairStats, line.Player2Id, line.Player2?.Name ?? "Unknown",
                    line.Player3Id.Value, line.Player3.Name, line);
            }
        }

        return pairStats.Values
            .Select(p => p.ToChemistryPair())
            .OrderByDescending(p => p.TotalIceTimeSeconds)
            .ToList();
    }

    public async Task UpsertBatchAsync(IEnumerable<LineCombination> lines, CancellationToken cancellationToken = default)
    {
        foreach (var line in lines)
        {
            var existing = await db.LineCombinations
                .FirstOrDefaultAsync(l =>
                    l.Season == line.Season &&
                    l.Team == line.Team &&
                    l.Situation == line.Situation &&
                    l.Player1Id == line.Player1Id &&
                    l.Player2Id == line.Player2Id &&
                    l.Player3Id == line.Player3Id,
                    cancellationToken);

            if (existing is null)
            {
                line.CreatedAt = DateTime.UtcNow;
                line.UpdatedAt = DateTime.UtcNow;
                db.LineCombinations.Add(line);
            }
            else
            {
                existing.IceTimeSeconds = line.IceTimeSeconds;
                existing.GamesPlayed = line.GamesPlayed;
                existing.GoalsFor = line.GoalsFor;
                existing.GoalsAgainst = line.GoalsAgainst;
                existing.ExpectedGoalsFor = line.ExpectedGoalsFor;
                existing.ExpectedGoalsAgainst = line.ExpectedGoalsAgainst;
                existing.ExpectedGoalsPct = line.ExpectedGoalsPct;
                existing.CorsiFor = line.CorsiFor;
                existing.CorsiAgainst = line.CorsiAgainst;
                existing.CorsiPct = line.CorsiPct;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static void AddPair(
        Dictionary<(int, int), ChemistryPairBuilder> pairStats,
        int player1Id, string player1Name,
        int player2Id, string player2Name,
        LineCombination line)
    {
        // Normalize key so (A,B) and (B,A) are the same pair
        var key = player1Id < player2Id ? (player1Id, player2Id) : (player2Id, player1Id);
        var (name1, name2) = player1Id < player2Id
            ? (player1Name, player2Name)
            : (player2Name, player1Name);

        if (!pairStats.TryGetValue(key, out var builder))
        {
            builder = new ChemistryPairBuilder(key.Item1, name1, key.Item2, name2);
            pairStats[key] = builder;
        }

        builder.Add(line);
    }

    private class ChemistryPairBuilder(int player1Id, string player1Name, int player2Id, string player2Name)
    {
        private int _totalIceTime;
        private int _gamesPlayed;
        private int _goalsFor;
        private int _goalsAgainst;
        private decimal _xgFor;
        private decimal _xgAgainst;
        private int _corsiFor;
        private int _corsiAgainst;

        public void Add(LineCombination line)
        {
            _totalIceTime += line.IceTimeSeconds;
            _gamesPlayed += line.GamesPlayed;
            _goalsFor += line.GoalsFor;
            _goalsAgainst += line.GoalsAgainst;
            _xgFor += line.ExpectedGoalsFor ?? 0;
            _xgAgainst += line.ExpectedGoalsAgainst ?? 0;
            _corsiFor += line.CorsiFor;
            _corsiAgainst += line.CorsiAgainst;
        }

        public ChemistryPair ToChemistryPair()
        {
            var totalXg = _xgFor + _xgAgainst;
            var totalCorsi = _corsiFor + _corsiAgainst;

            return new ChemistryPair(
                player1Id, player1Name,
                player2Id, player2Name,
                _totalIceTime,
                _gamesPlayed,
                _goalsFor,
                _goalsAgainst,
                totalXg > 0 ? Math.Round(_xgFor / totalXg, 2) : null,
                totalCorsi > 0 ? Math.Round((decimal)_corsiFor / totalCorsi, 2) : null
            );
        }
    }
}
