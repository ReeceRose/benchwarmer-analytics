using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Api.Endpoints;

public static class StandingsEndpoints
{
    public static void MapStandingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/standings")
            .WithTags("Standings");

        group.MapGet("/power-rankings", GetPowerRankings)
            .WithName("GetPowerRankings")
            .WithSummary("Get team power rankings with analytics")
            .WithDescription("""
                Returns league-wide team power rankings combining traditional standings with advanced analytics.

                Includes:
                - Traditional standings (W/L/OTL/Pts)
                - Expected goals metrics (xGF, xGA, xG%)
                - Possession metrics (CF%, FF%)
                - PDO (shooting % + save %) - values near 100 are sustainable
                - Points vs Expected Points comparison
                - Regression candidates (teams likely to improve or decline)

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                """)
            .Produces<PowerRankingsDto>()
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetPowerRankings(
        int? season,
        ITeamSeasonRepository teamSeasonRepository,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        // Get the latest season if not specified
        var targetSeason = season ?? await db.TeamSeasons
            .Select(ts => ts.Season)
            .Distinct()
            .OrderByDescending(s => s)
            .FirstOrDefaultAsync(cancellationToken);

        if (targetSeason == 0)
        {
            return Results.Ok(new PowerRankingsDto(
                targetSeason,
                [],
                new RegressionInsightsDto([], [])
            ));
        }

        // Get team season stats (all situations, regular season only) - this has accurate GP from MoneyPuck
        var teamSeasons = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "all", isPlayoffs: false, cancellationToken);

        // Build power rankings using TeamSeason data
        var rankings = teamSeasons.Select(StandingsMappers.BuildPowerRanking).ToList();

        // Sort by points and set ranks
        var sortedByPoints = rankings.OrderByDescending(r => r.Points).ThenByDescending(r => r.Wins).ToList();
        var sortedByXgPct = rankings.OrderByDescending(r => r.XGoalsPct).ToList();

        for (int i = 0; i < sortedByPoints.Count; i++)
        {
            var team = sortedByPoints[i];
            var xgRank = sortedByXgPct.FindIndex(r => r.Abbreviation == team.Abbreviation) + 1;

            sortedByPoints[i] = team with
            {
                PointsRank = i + 1,
                XGoalsPctRank = xgRank
            };
        }

        // Identify regression candidates
        var likelyToImprove = StandingsMappers.FindLikelyToImprove(sortedByPoints);
        var likelyToRegress = StandingsMappers.FindLikelyToRegress(sortedByPoints);

        return Results.Ok(new PowerRankingsDto(
            targetSeason,
            sortedByPoints,
            new RegressionInsightsDto(likelyToImprove, likelyToRegress)
        ));
    }
}
