namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Complete special teams overview for a team including power play and penalty kill stats.
/// </summary>
public record SpecialTeamsOverviewDto(
    string TeamAbbreviation,
    int Season,
    PowerPlaySummaryDto PowerPlay,
    PenaltyKillSummaryDto PenaltyKill
);

/// <summary>
/// Power play summary statistics.
/// </summary>
public record PowerPlaySummaryDto(
    /// <summary>Estimated power play opportunities (ice time / 120 seconds).</summary>
    int Opportunities,
    /// <summary>Power play goals scored.</summary>
    int Goals,
    /// <summary>Power play percentage (goals / opportunities * 100).</summary>
    decimal Percentage,
    /// <summary>Expected goals on the power play.</summary>
    decimal XGoals,
    /// <summary>Expected goals per 60 minutes of power play time.</summary>
    decimal XGoalsPer60,
    /// <summary>Shots on goal during power play.</summary>
    int ShotsFor,
    /// <summary>Shooting percentage on the power play.</summary>
    decimal ShootingPct,
    /// <summary>High danger chances on power play.</summary>
    int HighDangerChances,
    /// <summary>High danger goals on power play.</summary>
    int HighDangerGoals,
    /// <summary>League rank for PP% (1-32, lower is better).</summary>
    int? LeagueRank,
    /// <summary>Total ice time in seconds during power play.</summary>
    int IceTimeSeconds
);

/// <summary>
/// Penalty kill summary statistics.
/// </summary>
public record PenaltyKillSummaryDto(
    /// <summary>Times shorthanded (estimated from ice time / 120 seconds).</summary>
    int TimesShorthanded,
    /// <summary>Goals allowed while shorthanded.</summary>
    int GoalsAgainst,
    /// <summary>Penalty kill percentage ((1 - GA/times) * 100).</summary>
    decimal Percentage,
    /// <summary>Expected goals against while shorthanded.</summary>
    decimal XGoalsAgainst,
    /// <summary>Expected goals against per 60 minutes of PK time.</summary>
    decimal XGoalsAgainstPer60,
    /// <summary>Shots against while shorthanded.</summary>
    int ShotsAgainst,
    /// <summary>Save percentage while shorthanded.</summary>
    decimal SavePct,
    /// <summary>High danger chances against while shorthanded.</summary>
    int HighDangerAgainst,
    /// <summary>High danger goals against while shorthanded.</summary>
    int HighDangerGoalsAgainst,
    /// <summary>League rank for PK% (1-32, lower is better).</summary>
    int? LeagueRank,
    /// <summary>Total ice time in seconds while shorthanded.</summary>
    int IceTimeSeconds
);

/// <summary>
/// Player stats for special teams situations.
/// </summary>
public record SpecialTeamsPlayerDto(
    int PlayerId,
    string Name,
    string? Position,
    /// <summary>Ice time in the situation (seconds).</summary>
    int IceTimeSeconds,
    int Goals,
    int Assists,
    int Points,
    int Shots,
    decimal? XGoals,
    decimal? XGoalsPer60,
    decimal? PointsPer60,
    int GamesPlayed
);

/// <summary>
/// Response containing players for a special teams situation.
/// </summary>
public record SpecialTeamsPlayersDto(
    string TeamAbbreviation,
    int Season,
    string Situation,
    IReadOnlyList<SpecialTeamsPlayerDto> Players
);
