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
        string? positionFilter = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.ChemistryPairs
            .Where(c => c.Team == teamAbbrev && c.Season == season);

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(c => c.Situation == situation);
        }

        // Apply position filter
        if (!string.IsNullOrEmpty(positionFilter))
        {
            query = positionFilter.ToLowerInvariant() switch
            {
                // Forwards: C, LW, RW (both players must be forwards)
                "forward" or "forwards" => query.Where(c =>
                    (c.Player1Position == "C" || c.Player1Position == "LW" || c.Player1Position == "RW") &&
                    (c.Player2Position == "C" || c.Player2Position == "LW" || c.Player2Position == "RW")),
                // Defense: D (both players must be defensemen)
                "defense" or "defensemen" => query.Where(c =>
                    c.Player1Position == "D" && c.Player2Position == "D"),
                _ => query
            };
        }

        var pairs = await query
            .OrderByDescending(c => c.TotalIceTimeSeconds)
            .ToListAsync(cancellationToken);

        return pairs.Select(c => ToChemistryPair(c)).ToList();
    }

    public async Task<IReadOnlyList<ChemistryPair>> GetLinematesAsync(
        int playerId,
        int season,
        string? situation = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.ChemistryPairs
            .Where(c => c.Season == season &&
                       (c.Player1Id == playerId || c.Player2Id == playerId));

        if (!string.IsNullOrEmpty(situation))
        {
            query = query.Where(c => c.Situation == situation);
        }

        var pairs = await query
            .OrderByDescending(c => c.TotalIceTimeSeconds)
            .ToListAsync(cancellationToken);

        // Transform to return the "other" player as the linemate
        return pairs.Select(c =>
        {
            var isPlayer1 = c.Player1Id == playerId;
            return new ChemistryPair(
                isPlayer1 ? c.Player2Id : c.Player1Id,
                isPlayer1 ? c.Player2Name : c.Player1Name,
                isPlayer1 ? c.Player2Position : c.Player1Position,
                playerId,
                isPlayer1 ? c.Player1Name : c.Player2Name,
                isPlayer1 ? c.Player1Position : c.Player2Position,
                (int)c.TotalIceTimeSeconds,
                c.GamesPlayed,
                c.GoalsFor,
                c.GoalsAgainst,
                CalculatePercentage(c.XGoalsFor, c.XGoalsAgainst),
                CalculatePercentage(c.CorsiFor, c.CorsiAgainst)
            );
        }).ToList();
    }

    public async Task RefreshChemistryPairsAsync(CancellationToken cancellationToken = default)
    {
        // Use CONCURRENTLY to allow reads during refresh (requires unique index)
        await db.Database.ExecuteSqlRawAsync(
            "REFRESH MATERIALIZED VIEW CONCURRENTLY chemistry_pairs",
            cancellationToken);
    }

    private static ChemistryPair ToChemistryPair(Entities.ChemistryPairView c)
    {
        return new ChemistryPair(
            c.Player1Id,
            c.Player1Name,
            c.Player1Position,
            c.Player2Id,
            c.Player2Name,
            c.Player2Position,
            (int)c.TotalIceTimeSeconds,
            c.GamesPlayed,
            c.GoalsFor,
            c.GoalsAgainst,
            CalculatePercentage(c.XGoalsFor, c.XGoalsAgainst),
            CalculatePercentage(c.CorsiFor, c.CorsiAgainst)
        );
    }

    private static decimal? CalculatePercentage(decimal forValue, decimal againstValue)
    {
        var total = forValue + againstValue;
        return total > 0 ? Math.Round(forValue / total * 100, 1) : null;
    }

    public async Task UpsertBatchAsync(IEnumerable<LineCombination> lines, CancellationToken cancellationToken = default)
    {
        var linesList = lines.ToList();
        if (linesList.Count == 0) return;

        // Extract filter values to batch-fetch existing records
        var seasons = linesList.Select(l => l.Season).Distinct().ToList();
        var teams = linesList.Select(l => l.Team).Distinct().ToList();
        var situations = linesList.Select(l => l.Situation).Distinct().ToList();

        // Batch fetch all potentially existing records in a single query
        var existingRecords = await db.LineCombinations
            .Where(l => seasons.Contains(l.Season) &&
                       teams.Contains(l.Team) &&
                       situations.Contains(l.Situation))
            .ToListAsync(cancellationToken);

        // Build dictionary for O(1) lookup using composite key
        var existingLookup = existingRecords
            .ToDictionary(l => (l.Season, l.Team, l.Situation, l.Player1Id, l.Player2Id, l.Player3Id));

        var now = DateTime.UtcNow;

        foreach (var line in linesList)
        {
            var key = (line.Season, line.Team, line.Situation, line.Player1Id, line.Player2Id, line.Player3Id);

            if (existingLookup.TryGetValue(key, out var existing))
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
                existing.UpdatedAt = now;
            }
            else
            {
                line.CreatedAt = now;
                line.UpdatedAt = now;
                db.LineCombinations.Add(line);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
