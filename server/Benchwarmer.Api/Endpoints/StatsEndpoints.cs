using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Repositories;

namespace Benchwarmer.Api.Endpoints;

public static class StatsEndpoints
{
    public static void MapStatsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/stats")
            .WithTags("Stats");

        group.MapGet("/homepage", GetHomepageData)
            .WithName("GetHomepageData")
            .WithSummary("Get homepage dashboard data")
            .WithDescription("""
                Returns aggregated data for the homepage dashboard including:
                - League leaders in points, goals, xG, Corsi%, and ice time
                - Outliers (players over/under-performing their expected goals)
                - Top performing line combinations by xG%
                - League averages for reference

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `situation`: Game situation filter (5on5, all, 5on4, etc.). Defaults to 5on5.
                """)
            .Produces<HomepageDataDto>()
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetHomepageData(
        int? season,
        string? situation,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        // Default to current season (year of current date, or previous year if before October)
        var now = DateTime.Now;
        var defaultSeason = now.Month >= 10 ? now.Year : now.Year - 1;
        var effectiveSeason = season ?? defaultSeason;
        var effectiveSituation = situation ?? "5on5";

        var stats = await statsRepository.GetHomepageStatsAsync(
            effectiveSeason,
            effectiveSituation,
            leaderCount: 5,
            outlierCount: 15,
            topLinesCount: 5,
            cancellationToken);

        var response = new HomepageDataDto(
            effectiveSeason,
            effectiveSituation,
            new LeaderboardsDto(
                stats.PointsLeaders.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.GoalsLeaders.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.ExpectedGoalsLeaders.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.CorsiLeaders.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.IceTimeLeaders.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList()
            ),
            new OutliersDto(
                stats.RunningHot.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, o.Goals, o.ExpectedGoals, o.Differential)).ToList(),
                stats.RunningCold.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, o.Goals, o.ExpectedGoals, o.Differential)).ToList()
            ),
            stats.TopLines.Select(l => new TopLineDto(
                l.Id,
                l.Team,
                l.Players.Select(p => new LinePlayerDto(p.PlayerId, p.Name, p.Position)).ToList(),
                l.IceTimeSeconds,
                l.ExpectedGoalsPct,
                l.GoalsFor,
                l.GoalsAgainst
            )).ToList(),
            new LeagueAveragesDto(stats.AvgCorsiPct, stats.AvgExpectedGoalsPct),
            new GoalieLeaderboardsDto(
                stats.GoalieLeaders.SavePct.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.GoalieLeaders.GoalsAgainstAvg.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList(),
                stats.GoalieLeaders.GoalsSavedAboveExpected.Select(l => new LeaderEntryDto(l.PlayerId, l.Name, l.Team, l.Position, l.Value)).ToList()
            ),
            new GoalieOutliersDto(
                stats.GoalieOutliers.RunningHot.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList(),
                stats.GoalieOutliers.RunningCold.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList()
            )
        );

        return Results.Ok(response);
    }
}
