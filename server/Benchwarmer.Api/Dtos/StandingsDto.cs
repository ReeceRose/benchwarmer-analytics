namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Official NHL standings for a team.
/// </summary>
public record OfficialStandingsDto(
    string Abbreviation,
    string Name,
    string? Division,
    string? Conference,

    // Core standings
    int GamesPlayed,
    int Wins,
    int Losses,
    int OtLosses,
    int Points,
    decimal? PointPctg,

    // Goals
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifferential,

    // Home/Away splits
    string HomeRecord,
    string AwayRecord,

    // Recent form
    string Last10Record,
    string? Streak,

    // Playoff positioning
    int DivisionRank,
    int ConferenceRank,
    int LeagueRank,
    int WildcardRank
);

/// <summary>
/// Response for official standings endpoint.
/// </summary>
public record OfficialStandingsResponse(
    int? Season,
    IReadOnlyList<OfficialStandingsDto> Teams
);

/// <summary>
/// Team analytics for standings overlay.
/// </summary>
public record StandingsAnalyticsDto(
    string Abbreviation,

    // xGoals metrics
    decimal XGoalsFor,
    decimal XGoalsAgainst,
    decimal? XGoalsPct,

    // Possession
    decimal? CorsiPct,
    decimal? FenwickPct,

    // Luck indicators
    decimal? Pdo,
    decimal? ShootingPct,
    decimal? SavePct,

    // Expected vs actual
    int ExpectedPoints,
    int PointsDiff
);

/// <summary>
/// Response for standings analytics endpoint.
/// </summary>
public record StandingsAnalyticsResponse(
    int Season,
    IReadOnlyList<StandingsAnalyticsDto> Teams
);
