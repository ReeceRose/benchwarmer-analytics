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
    IReadOnlyList<PlayerDetailDto> Players
);
