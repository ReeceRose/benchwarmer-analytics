namespace Benchwarmer.Api.Dtos;

public record HomepageDataDto(
    int Season,
    string Situation,
    LeaderboardsDto Leaders,
    OutliersDto Outliers,
    IReadOnlyList<TopLineDto> TopLines,
    LeagueAveragesDto LeagueAverages
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
