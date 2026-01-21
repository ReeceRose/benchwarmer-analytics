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
}

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
