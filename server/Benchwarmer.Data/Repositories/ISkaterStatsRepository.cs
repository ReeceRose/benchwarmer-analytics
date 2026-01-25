using Benchwarmer.Data.Entities;

namespace Benchwarmer.Data.Repositories;

public interface ISkaterStatsRepository
{
    Task<IReadOnlyList<SkaterSeason>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        string? situation = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkaterSeason>> GetByTeamSeasonAsync(
        string teamAbbrev,
        int season,
        string situation = "all",
        bool? isPlayoffs = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkaterSeason>> GetBySeasonSituationAsync(
        int season,
        string situation,
        bool isPlayoffs = false,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkaterSeason>> GetBreakoutCandidatesAsync(
        int season,
        int minGames = 20,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<(int Age, decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int PlayerCount)>> GetLeagueAgeCurveAsync(
        int minGames = 20,
        bool useMedian = false,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<(int Age, int Season, decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int GamesPlayed)>> GetPlayerAgeCurveAsync(
        int playerId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<(decimal PointsPer60, decimal GoalsPer60, decimal XgPer60, int GamesPlayed)>> GetAgeDistributionAsync(
        int age,
        int minGames = 20,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets league percentile thresholds for a season.
    /// Returns arrays of values at each percentile (1-99) for key stats.
    /// </summary>
    Task<SeasonPercentiles> GetSeasonPercentilesAsync(
        int season,
        int minGames = 20,
        CancellationToken cancellationToken = default);

    Task UpsertBatchAsync(IEnumerable<SkaterSeason> stats, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SkaterSeason>> GetHotPlayersByTeamAsync(
        string teamAbbrev,
        int season,
        int limit = 5,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes the season_percentiles materialized view.
    /// Should be called after skater data is updated (e.g., during nightly sync).
    /// </summary>
    Task RefreshSeasonPercentilesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets rookies for a season based on NHL rookie criteria.
    /// See <see cref="NhlConstants"/> for eligibility thresholds.
    /// </summary>
    Task<IReadOnlyList<SkaterSeason>> GetRookiesAsync(
        int season,
        int minGames = 10,
        int limit = 100,
        string? position = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Percentile thresholds for a season. Each array contains 99 values (1st to 99th percentile).
/// </summary>
public record SeasonPercentiles(
    int Season,
    int MinGames,
    int PlayerCount,
    decimal[] PointsPerGame,
    decimal[] GoalsPerGame,
    decimal[] PointsPer60,
    decimal[] GoalsPer60
);
