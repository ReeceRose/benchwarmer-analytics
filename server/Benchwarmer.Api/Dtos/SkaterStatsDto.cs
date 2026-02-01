namespace Benchwarmer.Api.Dtos;

public record SkaterStatsDto(
    int Id,
    int PlayerId,
    int Season,
    string Team,
    string Situation,
    bool IsPlayoffs,
    int GamesPlayed,
    int IceTimeSeconds,
    int Goals,
    int Assists,
    int Points,
    int Shots,
    decimal? ExpectedGoals,
    decimal? ExpectedGoalsPer60,
    decimal? OnIceShootingPct,
    decimal? OnIceSavePct,
    decimal? CorsiForPct,
    decimal? FenwickForPct,
    // Shift quality fields (from SkaterSeasonAdvanced)
    decimal? Shifts,
    decimal? OZoneShiftStarts,
    decimal? DZoneShiftStarts,
    decimal? NZoneShiftStarts,
    decimal? OZoneShiftPct,  // Calculated: OZone / (OZone + DZone)
    decimal? DZoneShiftPct,  // Calculated: DZone / (OZone + DZone)
    // Faceoff fields
    decimal? FaceoffsWon,
    decimal? FaceoffsLost,
    decimal? FaceoffPct  // Calculated: Won / (Won + Lost)
);

public record PlayerStatsDto(
    int PlayerId,
    string PlayerName,
    IReadOnlyList<SkaterStatsDto> Stats
);
