namespace Benchwarmer.Api.Dtos;

public record TeamDto(
    int Id,
    string Abbreviation,
    string Name,
    string? Division,
    string? Conference,
    bool IsActive
);

public record TeamListDto(IReadOnlyList<TeamDto> Teams);
