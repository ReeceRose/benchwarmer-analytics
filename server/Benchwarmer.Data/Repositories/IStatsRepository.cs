namespace Benchwarmer.Data.Repositories;

public interface IStatsRepository
{
    Task<HomepageStats> GetHomepageStatsAsync(
        int season,
        string situation,
        int leaderCount = 5,
        int outlierCount = 5,
        int topLinesCount = 5,
        CancellationToken cancellationToken = default);

    Task<LeaderboardResult> GetLeaderboardAsync(
        string category,
        int season,
        string situation,
        int limit = 50,
        bool ascending = false,
        CancellationToken cancellationToken = default);

    Task<OutliersResult> GetOutliersAsync(
        int season,
        string situation,
        int skaterLimit = 15,
        int goalieLimit = 5,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TopLine>> GetTopLinesAsync(
        int season,
        string situation,
        int limit = 5,
        CancellationToken cancellationToken = default);
}

public record OutliersResult(
    IReadOnlyList<OutlierEntry> SkaterRunningHot,
    IReadOnlyList<OutlierEntry> SkaterRunningCold,
    IReadOnlyList<GoalieOutlierEntry> GoalieRunningHot,
    IReadOnlyList<GoalieOutlierEntry> GoalieRunningCold,
    decimal AvgCorsiPct,
    decimal AvgExpectedGoalsPct
);

public record HomepageStats(
    IReadOnlyList<LeaderEntry> PointsLeaders,
    IReadOnlyList<LeaderEntry> GoalsLeaders,
    IReadOnlyList<LeaderEntry> ExpectedGoalsLeaders,
    IReadOnlyList<LeaderEntry> CorsiLeaders,
    IReadOnlyList<LeaderEntry> IceTimeLeaders,
    IReadOnlyList<OutlierEntry> RunningHot,
    IReadOnlyList<OutlierEntry> RunningCold,
    IReadOnlyList<TopLine> TopLines,
    decimal AvgCorsiPct,
    decimal AvgExpectedGoalsPct,
    GoalieLeaderboards GoalieLeaders,
    GoalieOutliers GoalieOutliers
);

public record GoalieOutliers(
    IReadOnlyList<GoalieOutlierEntry> RunningHot,
    IReadOnlyList<GoalieOutlierEntry> RunningCold
);

public record GoalieOutlierEntry(
    int PlayerId,
    string Name,
    string? Team,
    string? HeadshotUrl,
    int GoalsAgainst,
    decimal ExpectedGoalsAgainst,
    decimal GoalsSavedAboveExpected
);

public record GoalieLeaderboards(
    IReadOnlyList<LeaderEntry> SavePct,
    IReadOnlyList<LeaderEntry> GoalsAgainstAvg,
    IReadOnlyList<LeaderEntry> GoalsSavedAboveExpected
);

public record LeaderEntry(
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    decimal Value
);

public record OutlierEntry(
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    string? HeadshotUrl,
    int Goals,
    decimal ExpectedGoals,
    decimal Differential
);

public record TopLine(
    int Id,
    string Team,
    IReadOnlyList<LinePlayer> Players,
    int IceTimeSeconds,
    decimal? ExpectedGoalsPct,
    int GoalsFor,
    int GoalsAgainst
);

public record LinePlayer(
    int PlayerId,
    string Name,
    string? Position
);

public record LeaderboardResult(
    string Category,
    int TotalCount,
    IReadOnlyList<LeaderboardResultEntry> Entries
);

public record LeaderboardResultEntry(
    int Rank,
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    decimal PrimaryValue,
    int GamesPlayed,
    // Skater stats
    int? Goals,
    int? Assists,
    int? Shots,
    decimal? ExpectedGoals,
    decimal? ExpectedGoalsPer60,
    decimal? CorsiForPct,
    decimal? FenwickForPct,
    decimal? OnIceShootingPct,
    decimal? OnIceSavePct,
    int? IceTimeSeconds,
    // Goalie stats
    decimal? SavePercentage,
    decimal? GoalsAgainstAverage,
    decimal? GoalsSavedAboveExpected,
    int? ShotsAgainst,
    int? GoalieIceTimeSeconds,
    int? GoalsAgainst,
    decimal? ExpectedGoalsAgainst,
    int? HighDangerShots,
    int? HighDangerGoals,
    int? MediumDangerShots,
    int? MediumDangerGoals,
    int? LowDangerShots,
    int? LowDangerGoals,
    int? Rebounds,
    decimal? ExpectedRebounds
);
