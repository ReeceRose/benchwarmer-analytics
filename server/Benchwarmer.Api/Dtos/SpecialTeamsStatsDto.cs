namespace Benchwarmer.Api.Dtos;

/// <summary>
/// Team special teams ranking with PP and PK stats for league-wide comparison.
/// </summary>
public record TeamSpecialTeamsRankingDto(
    string TeamAbbreviation,
    string TeamName,
    // Power Play
    /// <summary>Power play percentage (goals / opportunities * 100).</summary>
    decimal PpPct,
    /// <summary>League rank for PP% (1-32, lower is better).</summary>
    int PpRank,
    /// <summary>Power play goals scored.</summary>
    int PpGoals,
    /// <summary>Estimated power play opportunities.</summary>
    int PpOpportunities,
    /// <summary>Expected goals per 60 minutes on power play.</summary>
    decimal PpXgPer60,
    /// <summary>Shooting percentage on power play.</summary>
    decimal PpShPct,
    // Penalty Kill
    /// <summary>Penalty kill percentage ((1 - GA/times) * 100).</summary>
    decimal PkPct,
    /// <summary>League rank for PK% (1-32, lower is better).</summary>
    int PkRank,
    /// <summary>Goals against while shorthanded.</summary>
    int PkGoalsAgainst,
    /// <summary>Estimated times shorthanded.</summary>
    int PkTimesShort,
    /// <summary>Expected goals against per 60 minutes on penalty kill.</summary>
    decimal PkXgaPer60,
    /// <summary>Save percentage while shorthanded.</summary>
    decimal PkSvPct,
    // Combined
    /// <summary>Combined special teams percentage (PP% + PK%).</summary>
    decimal SpecialTeamsPct,
    /// <summary>Overall special teams rank (1-32, based on combined %).</summary>
    int OverallRank
);

/// <summary>
/// Response containing all teams' special teams rankings.
/// </summary>
public record TeamSpecialTeamsRankingsResponse(
    int Season,
    IReadOnlyList<TeamSpecialTeamsRankingDto> Teams
);

/// <summary>
/// Player penalty differential stats (drawn vs taken).
/// </summary>
public record PlayerPenaltyStatsDto(
    int PlayerId,
    string Name,
    string Team,
    string? Position,
    int GamesPlayed,
    /// <summary>Total ice time in minutes (5on5 situation).</summary>
    decimal IceTimeMinutes,
    // Penalties
    /// <summary>Number of penalties drawn.</summary>
    int PenaltiesDrawn,
    /// <summary>Number of penalties taken.</summary>
    int PenaltiesTaken,
    /// <summary>Net penalties (drawn - taken).</summary>
    int NetPenalties,
    /// <summary>Penalties drawn per 60 minutes.</summary>
    decimal PenaltiesDrawnPer60,
    /// <summary>Penalties taken per 60 minutes.</summary>
    decimal PenaltiesTakenPer60,
    /// <summary>Net penalties per 60 minutes.</summary>
    decimal NetPenaltiesPer60,
    /// <summary>Penalty minutes drawn.</summary>
    decimal PimDrawn,
    /// <summary>Penalty minutes taken.</summary>
    decimal PimTaken
);

/// <summary>
/// Response containing player penalty stats.
/// </summary>
public record PlayerPenaltyStatsResponse(
    int Season,
    IReadOnlyList<PlayerPenaltyStatsDto> Players
);

/// <summary>
/// Player stats for PP or PK specialist leaderboard.
/// </summary>
public record SpecialTeamsPlayerLeaderDto(
    int PlayerId,
    string Name,
    string Team,
    string? Position,
    int GamesPlayed,
    /// <summary>Ice time in minutes for this situation.</summary>
    decimal IceTimeMinutes,
    int Goals,
    int Assists,
    int Points,
    /// <summary>Points per 60 minutes in this situation.</summary>
    decimal PointsPer60,
    /// <summary>Expected goals per 60 minutes.</summary>
    decimal XgPer60,
    /// <summary>Actual goals minus expected goals.</summary>
    decimal GoalsDiff
);

/// <summary>
/// Response containing special teams player leaders.
/// </summary>
public record SpecialTeamsPlayerLeadersResponse(
    int Season,
    /// <summary>"5on4" for power play, "4on5" for penalty kill.</summary>
    string Situation,
    IReadOnlyList<SpecialTeamsPlayerLeaderDto> Players
);
