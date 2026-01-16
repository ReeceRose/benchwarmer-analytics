namespace Benchwarmer.Api.Dtos;

public record SeasonDto(
    int Year,
    string Label
);

public record SeasonListDto(IReadOnlyList<SeasonDto> Seasons);
