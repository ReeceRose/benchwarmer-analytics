using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Repositories;
using Microsoft.AspNetCore.Mvc;

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

        group.MapGet("/breakout-candidates", GetBreakoutCandidates)
            .WithName("GetBreakoutCandidates")
            .WithSummary("Get players poised for breakout seasons")
            .WithDescription("""
                Returns players with strong underlying metrics who may be underperforming their expected output.

                Breakout candidates are identified by:
                - High expected goals (xG) relative to actual goals scored
                - Strong possession metrics (Corsi For %)
                - Sufficient sample size (minimum games played)

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `minGames`: Minimum games played to be considered (default: 20)
                - `limit`: Maximum number of candidates to return (default: 50)
                """)
            .Produces<BreakoutCandidatesDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/age-curves", GetAgeCurves)
            .WithName("GetAgeCurves")
            .WithSummary("Get league-wide age curve data")
            .WithDescription("""
                Returns average performance metrics by age across all NHL players.

                Use this data to compare individual player trajectories against league averages.

                **Query Parameters:**
                - `minGames`: Minimum games played per season to include (default: 20)
                - `playerId`: Optional player ID to include their individual age curve
                """)
            .Produces<AgeCurvesDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/age-distribution/{age:int}", GetAgeDistribution)
            .WithName("GetAgeDistribution")
            .WithSummary("Get distribution of player performance at a specific age")
            .WithDescription("""
                Returns individual player performance data at a specific age for histogram visualization.

                **Path Parameters:**
                - `age`: The age to get distribution for (18-45)

                **Query Parameters:**
                - `minGames`: Minimum games played per season to include (default: 20)
                """)
            .Produces<AgeDistributionDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/season-percentiles/{season:int}", GetSeasonPercentiles)
            .WithName("GetSeasonPercentiles")
            .WithSummary("Get league percentile thresholds for a season")
            .WithDescription("""
                Returns percentile thresholds (1-99) for key stats in a given season.
                Use this to calculate where a player ranks among their peers.

                **Path Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season)

                **Query Parameters:**
                - `minGames`: Minimum games played to be included (default: 20)
                """)
            .Produces<SeasonPercentilesDto>()
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

    private static async Task<IResult> GetBreakoutCandidates(
        int? season,
        int? minGames,
        int? limit,
        ISkaterStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Now;
        var defaultSeason = now.Month >= 10 ? now.Year : now.Year - 1;
        var effectiveSeason = season ?? defaultSeason;
        var effectiveMinGames = minGames ?? 20;
        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);

        var candidates = await statsRepository.GetBreakoutCandidatesAsync(
            effectiveSeason,
            effectiveMinGames,
            effectiveLimit,
            cancellationToken);

        var candidateDtos = candidates.Select(c => new BreakoutCandidateDto(
            c.PlayerId,
            c.Player?.Name ?? "Unknown",
            c.Team,
            c.Player?.Position,
            c.GamesPlayed,
            c.Goals,
            c.Assists,
            c.Shots,
            Math.Round(c.ExpectedGoals ?? 0, 2),
            Math.Round((c.ExpectedGoals ?? 0) - c.Goals, 2), // Goals below expected (positive = unlucky)
            c.CorsiForPct,
            c.FenwickForPct,
            c.IceTimeSeconds > 0
                ? Math.Round((decimal)c.Shots / c.IceTimeSeconds * 3600, 2)
                : 0, // Shots per 60
            CalculateBreakoutScore(c)
        )).ToList();

        return Results.Ok(new BreakoutCandidatesDto(
            effectiveSeason,
            effectiveMinGames,
            candidateDtos
        ));
    }

    private static decimal CalculateBreakoutScore(Data.Entities.SkaterSeason stats)
    {
        // Breakout score: combination of xG differential, CF%, and shot rate
        // Higher score = more likely to break out
        var xgDiff = (stats.ExpectedGoals ?? 0) - stats.Goals;
        var corsiBonus = ((stats.CorsiForPct ?? 50) - 50) / 10; // +/- based on CF%
        var shotRate = stats.IceTimeSeconds > 0
            ? (decimal)stats.Shots / stats.IceTimeSeconds * 3600
            : 0;
        var shotBonus = (shotRate - 7) / 3; // Average shot rate ~7/60, bonus/penalty

        return Math.Round(xgDiff + corsiBonus + shotBonus, 2);
    }

    private static async Task<IResult> GetAgeCurves(
        int? minGames,
        bool? useMedian,
        [FromQuery(Name = "playerIds")] string? playerIdsParam,
        ISkaterStatsRepository statsRepository,
        IPlayerRepository playerRepository,
        CancellationToken cancellationToken)
    {
        var effectiveMinGames = minGames ?? 20;
        var effectiveUseMedian = useMedian ?? false;

        // Parse comma-separated player IDs (max 5 players)
        var playerIds = new List<int>();
        if (!string.IsNullOrWhiteSpace(playerIdsParam))
        {
            playerIds = playerIdsParam
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out var id) ? id : (int?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .Take(5)
                .ToList();
        }

        // Get league-wide age curve
        var leagueCurve = await statsRepository.GetLeagueAgeCurveAsync(effectiveMinGames, effectiveUseMedian, cancellationToken);
        var leagueData = leagueCurve.Select(c => new AgeDataPointDto(
            c.Age,
            null,
            c.PointsPer60,
            c.GoalsPer60,
            c.XgPer60,
            c.PlayerCount
        )).ToList();

        // Fetch player curves sequentially (DbContext is not thread-safe)
        var playerCurves = new List<PlayerAgeCurveDto>();
        foreach (var playerId in playerIds)
        {
            var player = await playerRepository.GetByIdAsync(playerId, cancellationToken);
            if (player is null) continue;

            var playerData = await statsRepository.GetPlayerAgeCurveAsync(playerId, cancellationToken);
            playerCurves.Add(new PlayerAgeCurveDto(
                playerId,
                player.Name,
                playerData.Select(p => new AgeDataPointDto(
                    p.Age,
                    p.Season,
                    p.PointsPer60,
                    p.GoalsPer60,
                    p.XgPer60,
                    p.GamesPlayed
                )).ToList()
            ));
        }

        return Results.Ok(new AgeCurvesResponseDto(effectiveMinGames, effectiveUseMedian, leagueData, playerCurves));
    }

    private static async Task<IResult> GetAgeDistribution(
        int age,
        int? minGames,
        ISkaterStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        if (age < 18 || age > 45)
        {
            return Results.BadRequest("Age must be between 18 and 45");
        }

        var effectiveMinGames = minGames ?? 20;
        var distribution = await statsRepository.GetAgeDistributionAsync(age, effectiveMinGames, cancellationToken);

        var dataPoints = distribution.Select(d => new DistributionDataPointDto(
            d.PointsPer60,
            d.GoalsPer60,
            d.XgPer60,
            d.GamesPlayed
        )).ToList();

        return Results.Ok(new AgeDistributionDto(age, effectiveMinGames, dataPoints));
    }

    private static async Task<IResult> GetSeasonPercentiles(
        int season,
        int? minGames,
        ISkaterStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveMinGames = minGames ?? 20;
        var percentiles = await statsRepository.GetSeasonPercentilesAsync(season, effectiveMinGames, cancellationToken);

        return Results.Ok(new SeasonPercentilesDto(
            percentiles.Season,
            percentiles.MinGames,
            percentiles.PlayerCount,
            percentiles.PointsPerGame,
            percentiles.GoalsPerGame,
            percentiles.PointsPer60,
            percentiles.GoalsPer60
        ));
    }
}

public record SeasonPercentilesDto(
    int Season,
    int MinGames,
    int PlayerCount,
    decimal[] PointsPerGame,
    decimal[] GoalsPerGame,
    decimal[] PointsPer60,
    decimal[] GoalsPer60
);

public record BreakoutCandidateDto(
    int PlayerId,
    string Name,
    string Team,
    string? Position,
    int GamesPlayed,
    int Goals,
    int Assists,
    int Shots,
    decimal ExpectedGoals,
    decimal GoalsDifferential, // Positive = shooting below expected (unlucky)
    decimal? CorsiForPct,
    decimal? FenwickForPct,
    decimal ShotsPer60,
    decimal BreakoutScore // Combined metric for likelihood of breakout
);

public record BreakoutCandidatesDto(
    int Season,
    int MinGamesPlayed,
    IReadOnlyList<BreakoutCandidateDto> Candidates
);

public record AgeDataPointDto(
    int Age,
    int? Season, // null for league averages, present for individual player
    decimal PointsPer60,
    decimal GoalsPer60,
    decimal XgPer60,
    int SampleSize // PlayerCount for league, GamesPlayed for individual
);

public record PlayerAgeCurveDto(
    int PlayerId,
    string PlayerName,
    IReadOnlyList<AgeDataPointDto> DataPoints
);

public record AgeCurvesDto(
    int MinGamesPlayed,
    IReadOnlyList<AgeDataPointDto> LeagueCurve,
    PlayerAgeCurveDto? PlayerCurve
);

public record AgeCurvesResponseDto(
    int MinGamesPlayed,
    bool UseMedian,
    IReadOnlyList<AgeDataPointDto> LeagueCurve,
    IReadOnlyList<PlayerAgeCurveDto> PlayerCurves
);

public record DistributionDataPointDto(
    decimal PointsPer60,
    decimal GoalsPer60,
    decimal XgPer60,
    int GamesPlayed
);

public record AgeDistributionDto(
    int Age,
    int MinGamesPlayed,
    IReadOnlyList<DistributionDataPointDto> DataPoints
);
