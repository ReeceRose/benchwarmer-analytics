namespace Benchwarmer.Api.Dtos;

public record TeamDto(
    int Id,
    string Abbreviation,
    string Name,
    string? Division,
    string? Conference
);

public record TeamListDto(IReadOnlyList<TeamDto> Teams);
