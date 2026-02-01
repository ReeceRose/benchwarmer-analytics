namespace Benchwarmer.Api.Dtos;

public record GoalieLeagueBaselinesDto(
    IReadOnlyList<int> Seasons,
    string Situation,
    bool IsPlayoffs,
    decimal? LowDangerSavePct,
    decimal? MediumDangerSavePct,
    decimal? HighDangerSavePct,
    decimal? ReboundRatio,
    int LowDangerShots,
    int MediumDangerShots,
    int HighDangerShots,
    decimal ExpectedRebounds,
    int Rebounds
);

