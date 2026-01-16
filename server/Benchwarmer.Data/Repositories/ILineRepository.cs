using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ILineRepository
{
    Task<(IReadOnlyList<LineCombination> Lines, int TotalCount)> GetByTeamAsync(
        string teamAbbrev,
        int season,
        string? situation = null,
        string? lineType = null,
        int minToiSeconds = 0,
        string? sortBy = null,
        bool sortDescending = true,
        int? page = null,
        int? pageSize = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChemistryPair>> GetChemistryMatrixAsync(
        string teamAbbrev,
        int season,
        string? situation = null,
        CancellationToken cancellationToken = default);

    Task UpsertBatchAsync(IEnumerable<LineCombination> lines, CancellationToken cancellationToken = default);
}

public record ChemistryPair(
    int Player1Id,
    string Player1Name,
    int Player2Id,
    string Player2Name,
    int TotalIceTimeSeconds,
    int GamesPlayed,
    int GoalsFor,
    int GoalsAgainst,
    decimal? ExpectedGoalsPct,
    decimal? CorsiPct
);
