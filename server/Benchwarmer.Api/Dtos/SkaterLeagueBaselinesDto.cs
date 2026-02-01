namespace Benchwarmer.Api.Dtos;

public record SkaterLeagueBaselinesDto(
    IReadOnlyList<int> Seasons,
    string Situation,
    bool IsPlayoffs,
    decimal? FaceoffPct,
    decimal TotalFaceoffsWon,
    decimal TotalFaceoffsLost
);
