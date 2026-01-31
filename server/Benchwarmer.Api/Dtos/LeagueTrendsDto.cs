namespace Benchwarmer.Api.Dtos;

public record LeagueTrendsResponseDto(
    string Situation,
    IReadOnlyList<SeasonTrendDto> Seasons
);

public record SeasonTrendDto(
    int Season,
    int TotalPlayers,
    int TotalGamesPlayed,
    int TotalGoals,
    int TotalAssists,
    int TotalShots,
    decimal TotalExpectedGoals,
    decimal AvgCorsiPct,
    decimal AvgGoalsPerGame,
    decimal AvgAssistsPerGame,
    decimal AvgToiPerGame,
    decimal AvgXgPer60
);
