namespace Benchwarmer.Api.Dtos;

public record PlayerSummaryDto(
    int Id,
    string Name,
    string? Position
);

public record LineCombinationDto(
    int Id,
    int Season,
    string Team,
    string Situation,
    PlayerSummaryDto Player1,
    PlayerSummaryDto Player2,
    PlayerSummaryDto? Player3,
    int IceTimeSeconds,
    int GamesPlayed,
    int GoalsFor,
    int GoalsAgainst,
    decimal? ExpectedGoalsPct,
    decimal? CorsiPct
);

public record LineListDto(
    IReadOnlyList<LineCombinationDto> Lines,
    int TotalCount,
    int? Page,
    int? PageSize,
    int? TotalPages
);

public record ChemistryPairDto(
    int Player1Id,
    string Player1Name,
    int Player2Id,
    string Player2Name,
    int TotalIceTimeSeconds,
    int GamesPlayed,
    int GoalsFor,
    int GoalsAgainst,
    decimal? ExpectedGoalsPct,
    decimal? CorsiPct
);

public record ChemistryMatrixDto(
    string Team,
    int Season,
    string? Situation,
    IReadOnlyList<ChemistryPairDto> Pairs
);
