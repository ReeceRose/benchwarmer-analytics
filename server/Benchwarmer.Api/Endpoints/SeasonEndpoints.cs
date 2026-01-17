using Benchwarmer.Api.Dtos;
using Benchwarmer.Data;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Api.Endpoints;

public static class SeasonEndpoints
{
    public static void MapSeasonEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/seasons")
            .WithTags("Seasons");

        group.MapGet("/", GetAllSeasons)
            .WithName("GetAllSeasons")
            .WithSummary("Get all available seasons with data")
            .WithDescription("""
                Returns all NHL seasons that have data in the database, sorted by most recent first.

                Each season includes:
                - `year`: The starting year (e.g., 2024 for the 2024-25 season)
                - `label`: Display label (e.g., "2024-25")
                """)
            .Produces<SeasonListDto>();
    }

    private static async Task<IResult> GetAllSeasons(
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var seasons = await db.SkaterSeasons
            .Select(s => s.Season)
            .Distinct()
            .OrderByDescending(s => s)
            .ToListAsync(cancellationToken);

        var dtos = seasons.Select(year => new SeasonDto(
            year,
            $"{year}-{(year + 1) % 100:D2}"
        )).ToList();

        return Results.Ok(new SeasonListDto(dtos));
    }
}
