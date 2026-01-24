namespace Benchwarmer.Api.Dtos;

public record HomepageDataDto(
    int Season,
    string Situation,
    LeaderboardsDto Leaders,
    OutliersDto Outliers,
    IReadOnlyList<TopLineDto> TopLines,
    LeagueAveragesDto LeagueAverages,
    GoalieLeaderboardsDto GoalieLeaders,
    GoalieOutliersDto GoalieOutliers
);

public record LeaderboardsDto(
    IReadOnlyList<LeaderEntryDto> Points,
    IReadOnlyList<LeaderEntryDto> Goals,
    IReadOnlyList<LeaderEntryDto> ExpectedGoals,
    IReadOnlyList<LeaderEntryDto> CorsiPct,
    IReadOnlyList<LeaderEntryDto> IceTime
);

public record LeaderEntryDto(
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    decimal Value
);

public record OutliersDto(
    IReadOnlyList<OutlierEntryDto> RunningHot,
    IReadOnlyList<OutlierEntryDto> RunningCold
);

public record OutlierEntryDto(
    int PlayerId,
    string Name,
    string? Team,
    string? Position,
    string? HeadshotUrl,
    int Goals,
    decimal ExpectedGoals,
    decimal Differential
);

public record TopLineDto(
    int Id,
    string Team,
    IReadOnlyList<LinePlayerDto> Players,
    int IceTimeSeconds,
    decimal? ExpectedGoalsPct,
    int GoalsFor,
    int GoalsAgainst
);

public record LinePlayerDto(
    int PlayerId,
    string Name,
    string? Position
);

public record LeagueAveragesDto(
    decimal CorsiPct,
    decimal ExpectedGoalsPct
);

public record GoalieLeaderboardsDto(
    IReadOnlyList<LeaderEntryDto> SavePct,
    IReadOnlyList<LeaderEntryDto> GoalsAgainstAvg,
    IReadOnlyList<LeaderEntryDto> GoalsSavedAboveExpected
);

public record GoalieOutliersDto(
    IReadOnlyList<GoalieOutlierEntryDto> RunningHot,
    IReadOnlyList<GoalieOutlierEntryDto> RunningCold
);

public record GoalieOutlierEntryDto(
    int PlayerId,
    string Name,
    string? Team,
    string? HeadshotUrl,
    int GoalsAgainst,
    decimal ExpectedGoalsAgainst,
    decimal GoalsSavedAboveExpected
);
