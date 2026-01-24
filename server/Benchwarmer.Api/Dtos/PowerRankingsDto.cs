namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Full power rankings response with team stats and regression insights.
/// </summary>
public record PowerRankingsDto(
    int Season,
    IReadOnlyList<TeamPowerRankingDto> Teams,
    RegressionInsightsDto Insights
);

/// <summary>
/// Individual team's power ranking data.
/// </summary>
public record TeamPowerRankingDto(
    string Abbreviation,
    string Name,
    string? Division,
    string? Conference,

    // Standings
    int GamesPlayed,
    int Wins,
    int Losses,
    int OtLosses,
    int Points,
    int GoalsFor,
    int GoalsAgainst,

    // Analytics
    decimal XGoalsFor,
    decimal XGoalsAgainst,
    decimal? XGoalsPct,
    decimal? CorsiPct,
    decimal? FenwickPct,

    // PDO (Sh% + Sv%) - values near 100 are sustainable
    decimal? Pdo,
    decimal? ShootingPct,
    decimal? SavePct,

    // Special teams
    decimal? PpPct,  // Power play percentage
    decimal? PkPct,  // Penalty kill percentage

    // Expected vs Actual
    int ExpectedPoints,
    int PointsDiff,  // Points - ExpectedPoints (positive = overperforming)

    // Ranks
    int PointsRank,
    int XGoalsPctRank
);

/// <summary>
/// Regression candidates and insights.
/// </summary>
public record RegressionInsightsDto(
    IReadOnlyList<RegressionCandidateDto> LikelyToImprove,
    IReadOnlyList<RegressionCandidateDto> LikelyToRegress
);

/// <summary>
/// Team identified as a regression candidate.
/// </summary>
public record RegressionCandidateDto(
    string Abbreviation,
    string Name,
    int PointsRank,
    int XGoalsPctRank,
    decimal? Pdo,
    string Reason
);
