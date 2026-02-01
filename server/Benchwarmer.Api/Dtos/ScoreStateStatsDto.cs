namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Stats for a single score state (leading, trailing, or tied).
/// </summary>
public record ScoreStateBreakdown(
    string State,
    int ShotsFor,
    int ShotsAgainst,
    int GoalsFor,
    int GoalsAgainst,
    decimal XGoalsFor,
    decimal XGoalsAgainst,
    decimal? ShootingPct,
    decimal? SavePct,
    decimal XGDifferential,
    int? TimeSeconds
);

/// <summary>
/// Complete score state statistics for a team.
/// </summary>
public record ScoreStateStatsDto(
    string TeamAbbreviation,
    int Season,
    bool IsPlayoffs,
    ScoreStateBreakdown Leading,
    ScoreStateBreakdown Trailing,
    ScoreStateBreakdown Tied,
    ScoreStateBreakdown Total
);
