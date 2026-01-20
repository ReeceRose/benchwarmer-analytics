namespace Benchwarmer.Api.Dtos;

public record PlayerDto(
    int Id,
    string Name,
    string? Position,
    string? CurrentTeamAbbreviation
);

public record PlayerDetailDto(
    int Id,
    string Name,
    string? FirstName,
    string? LastName,
    string? Position,
    string? CurrentTeamAbbreviation,
    string? HeadshotUrl,
    DateOnly? BirthDate,
    int? HeightInches,
    int? WeightLbs,
    string? Shoots
);

public record PlayerSearchResultDto(
    IReadOnlyList<PlayerDto> Players,
    int TotalCount,
    int? Page,
    int? PageSize,
    int? TotalPages
);

public record RosterDto(
    string TeamAbbreviation,
    IReadOnlyList<RosterPlayerDto> Players,
    int? Season = null,
    bool? Playoffs = null
);

public record RosterPlayerDto(
    int Id,
    string Name,
    string? FirstName,
    string? LastName,
    string? Position,
    string? CurrentTeamAbbreviation,
    string? HeadshotUrl,
    DateOnly? BirthDate,
    int? HeightInches,
    int? WeightLbs,
    string? Shoots,
    // Stats (only populated when season is specified)
    int? GamesPlayed = null,
    int? IceTimeSeconds = null,
    int? Goals = null,
    int? Assists = null,
    int? Points = null,
    int? Shots = null,
    decimal? ExpectedGoals = null,
    decimal? CorsiForPct = null
);
