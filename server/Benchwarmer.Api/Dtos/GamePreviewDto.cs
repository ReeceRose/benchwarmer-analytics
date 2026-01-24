namespace Benchwarmer.Api.Dtos;

public record GamePreviewDto(
    GamePreviewGameDto Game,
    HeadToHeadDto HeadToHead,
    TeamComparisonDto TeamComparison,
    HotPlayersDto HotPlayers,
    GoalieMatchupDto GoalieMatchup
);

public record GamePreviewGameDto(
    string Id,
    DateOnly Date,
    string HomeTeam,
    string AwayTeam,
    string? StartTimeUtc
);

public record HeadToHeadDto(
    SeasonRecordDto Season,
    IReadOnlyList<PastGameDto> LastFive
);

public record SeasonRecordDto(
    int HomeWins,
    int AwayWins,
    int OvertimeLosses
);

public record PastGameDto(
    DateOnly Date,
    string Score,
    string Winner,
    string? OvertimeType
);

public record TeamComparisonDto(
    TeamPreviewStatsDto Home,
    TeamPreviewStatsDto Away
);

public record TeamPreviewStatsDto(
    string TeamCode,
    int GamesPlayed,
    decimal XGoalsFor,
    decimal XGoalsAgainst,
    decimal? XGoalsPct,
    decimal? CorsiPct,
    decimal? PowerPlayPct,
    decimal? PenaltyKillPct,
    // New fields from NHL standings
    string? Streak,
    string? HomeRecord,
    string? RoadRecord,
    string? Last10
);

public record TeamRecordDto(int Wins, int Losses, int OtLosses);

public record HotPlayersDto(
    IReadOnlyList<HotPlayerDto> Home,
    IReadOnlyList<HotPlayerDto> Away
);

public record HotPlayerDto(
    int PlayerId,
    string Name,
    string? Position,
    int Goals,
    int Assists,
    decimal ExpectedGoals,
    decimal Differential,
    string Trend
);

public record GoalieMatchupDto(
    IReadOnlyList<GoaliePreviewDto> Home,
    IReadOnlyList<GoaliePreviewDto> Away
);

public record GoaliePreviewDto(
    int PlayerId,
    string Name,
    int GamesPlayed,
    decimal? SavePct,
    decimal? GoalsAgainstAvg,
    decimal? GoalsSavedAboveExpected
);

// Separate DTO for goalie recent form (fetched on-demand from boxscores)
public record GoalieRecentFormDto(
    int PlayerId,
    string Name,
    int GamesPlayed,
    decimal? SavePct,
    int ShotsAgainst,
    int GoalsAgainst
);

public record GoalieRecentFormResponseDto(
    IReadOnlyList<GoalieRecentFormDto> Home,
    IReadOnlyList<GoalieRecentFormDto> Away
);
