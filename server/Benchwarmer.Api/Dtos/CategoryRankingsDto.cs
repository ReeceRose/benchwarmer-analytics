namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Category rankings for a single team, showing both raw values and ranks (1-32).
/// </summary>
public record TeamCategoryRanksDto(
    string Abbreviation,
    string Name,

    // Raw values (for tooltips)
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifferential,
    decimal XGoalsFor,
    decimal XGoalsAgainst,
    decimal? XGoalsPct,
    decimal? CorsiPct,
    decimal? FenwickPct,
    decimal? PpPct,
    decimal? PkPct,
    int HighDangerChancesFor,
    int HighDangerChancesAgainst,
    decimal? ShootingPct,
    decimal? SavePct,
    decimal? FaceoffPct,
    int PenaltiesDrawn,
    int PenaltiesTaken,
    int PenaltyDifferential,
    int Hits,
    int HitsAgainst,
    int Takeaways,
    int Giveaways,
    int BlockedShots,

    // Points vs Overall Rank (over/under performance) - only for current season
    int? Points,
    int? PointsRank,

    // Overall composite rank (weighted average of all ranks)
    int OverallRank,
    decimal OverallScore,

    // Ranks (1-32)
    int GoalsForRank,
    int GoalsAgainstRank,
    int GoalDifferentialRank,
    int XGoalsForRank,
    int XGoalsAgainstRank,
    int XGoalsPctRank,
    int CorsiPctRank,
    int FenwickPctRank,
    int PpPctRank,
    int PkPctRank,
    int HighDangerForRank,
    int HighDangerAgainstRank,
    int ShootingPctRank,
    int SavePctRank,
    int FaceoffPctRank,
    int PenaltiesDrawnRank,
    int PenaltiesTakenRank,
    int PenaltyDifferentialRank,
    int HitsRank,
    int HitsAgainstRank,
    int TakeawaysRank,
    int GiveawaysRank,
    int BlockedShotsRank
);

/// <summary>
/// Response for the category rankings endpoint.
/// </summary>
public record CategoryRankingsResponse(
    int Season,
    IReadOnlyList<TeamCategoryRanksDto> Teams
);
