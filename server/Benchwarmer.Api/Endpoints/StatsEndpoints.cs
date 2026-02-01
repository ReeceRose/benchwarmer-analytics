using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        group.MapGet("/outliers", GetOutliers)
            .WithName("GetOutliers")
            .WithSummary("Get skater and goalie outliers")
            .WithDescription("""
                Returns players over/under-performing their expected metrics.

                **Skaters:** Based on Goals vs Expected Goals differential
                **Goalies:** Based on Goals Saved Above Expected (GSAx)

                Also includes league averages for Corsi% and xG%.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `situation`: Game situation filter (5on5, all, 5on4, etc.). Defaults to 5on5.
                - `skaterLimit`: Max skater outliers per category (default: 15)
                - `goalieLimit`: Max goalie outliers per category (default: 5)
                """)
            .Produces<OutliersResponseDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/top-lines", GetTopLines)
            .WithName("GetTopLines")
            .WithSummary("Get top performing line combinations")
            .WithDescription("""
                Returns top line combinations ranked by Expected Goals Percentage (xG%).

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `situation`: Game situation filter (5on5, all, 5on4, etc.). Defaults to 5on5.
                - `limit`: Maximum lines to return (default: 5)
                """)
            .Produces<TopLinesResponseDto>()
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

        group.MapGet("/leaderboards", GetLeaderboard)
            .WithName("GetLeaderboard")
            .WithSummary("Get leaderboard for a specific stat category")
            .WithDescription("""
                Returns ranked list of players for a given stat category.

                **Skater Categories:** points, goals, expectedGoals, corsiPct, iceTime
                **Goalie Categories:** savePct, gaa, gsax

                **Query Parameters:**
                - `category`: Stat category (required)
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `situation`: Game situation filter (5on5, all, 5on4, etc.). Defaults to all. Ignored for goalie categories.
                - `limit`: Maximum entries to return (default: 50, max: 100)
                - `sortDir`: Sort direction (asc or desc). Defaults to desc (top performers first).
                """)
            .Produces<LeaderboardResponseDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/rookies", GetRookies)
            .WithName("GetRookies")
            .WithSummary("Get rookie players for a season")
            .WithDescription("""
                Returns players meeting NHL rookie criteria:
                - No prior season with 26+ games played
                - Under 26 years old as of September 15 of the season

                Includes a composite Rookie Score based on production and underlying metrics.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `minGames`: Minimum games played to be included (default: 10)
                - `limit`: Maximum rookies to return (default: 50, max: 100)
                - `position`: Position filter: "F" for forwards, "D" for defensemen, omit for all
                """)
            .Produces<RookiesResponseDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/league-trends", GetLeagueTrends)
            .WithName("GetLeagueTrends")
            .WithSummary("Get league-wide trends across seasons")
            .WithDescription("""
                Returns aggregated league statistics for each season to visualize trends over time.

                Includes total goals, assists, shots, expected goals, and per-game averages.
                Corsi% is weighted by ice time for accurate league-wide representation.

                **Query Parameters:**
                - `situation`: Game situation filter (5on5, all, 5on4, etc.). Defaults to all.
                """)
            .Produces<LeagueTrendsResponseDto>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/goalie-league-baselines", GetGoalieLeagueBaselines)
            .WithName("GetGoalieLeagueBaselines")
            .WithSummary("Get league baselines for goalie split stats")
            .WithDescription("""
                Returns league-wide baseline values for goalie split metrics (danger-zone SV% and rebound ratio),
                computed from the GoalieSeason table (weighted by shots / expected rebounds).

                **Query Parameters:**
                - `seasons`: Comma-separated list of seasons to include (e.g., "2022,2023,2024"). Defaults to current season.
                - `situation`: Game situation filter (all, 5on5, 5on4, 4on5, other). Defaults to "all".
                - `playoffs`: If true, use playoff rows. Defaults to false.
                """)
            .Produces<GoalieLeagueBaselinesDto>()
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetHomepageData(
        int? season,
        string? situation,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
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
                stats.RunningHot.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, PlayerHelpers.GetHeadshotUrl(o.PlayerId, o.HeadshotUrl, o.Team), o.Goals, o.ExpectedGoals, o.Differential)).ToList(),
                stats.RunningCold.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, PlayerHelpers.GetHeadshotUrl(o.PlayerId, o.HeadshotUrl, o.Team), o.Goals, o.ExpectedGoals, o.Differential)).ToList()
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
                stats.GoalieOutliers.RunningHot.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, PlayerHelpers.GetHeadshotUrl(g.PlayerId, g.HeadshotUrl, g.Team), g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList(),
                stats.GoalieOutliers.RunningCold.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, PlayerHelpers.GetHeadshotUrl(g.PlayerId, g.HeadshotUrl, g.Team), g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList()
            )
        );

        return Results.Ok(response);
    }

    private static async Task<IResult> GetOutliers(
        int? season,
        string? situation,
        int? skaterLimit,
        int? goalieLimit,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
        var effectiveSituation = situation ?? "5on5";
        var effectiveSkaterLimit = Math.Clamp(skaterLimit ?? 15, 1, 50);
        var effectiveGoalieLimit = Math.Clamp(goalieLimit ?? 5, 1, 20);

        var result = await statsRepository.GetOutliersAsync(
            effectiveSeason,
            effectiveSituation,
            effectiveSkaterLimit,
            effectiveGoalieLimit,
            cancellationToken);

        var response = new OutliersResponseDto(
            effectiveSeason,
            effectiveSituation,
            new SkaterOutliersDto(
                result.SkaterRunningHot.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, PlayerHelpers.GetHeadshotUrl(o.PlayerId, o.HeadshotUrl, o.Team), o.Goals, o.ExpectedGoals, o.Differential)).ToList(),
                result.SkaterRunningCold.Select(o => new OutlierEntryDto(o.PlayerId, o.Name, o.Team, o.Position, PlayerHelpers.GetHeadshotUrl(o.PlayerId, o.HeadshotUrl, o.Team), o.Goals, o.ExpectedGoals, o.Differential)).ToList()
            ),
            new GoalieOutliersDto(
                result.GoalieRunningHot.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, PlayerHelpers.GetHeadshotUrl(g.PlayerId, g.HeadshotUrl, g.Team), g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList(),
                result.GoalieRunningCold.Select(g => new GoalieOutlierEntryDto(g.PlayerId, g.Name, g.Team, PlayerHelpers.GetHeadshotUrl(g.PlayerId, g.HeadshotUrl, g.Team), g.GoalsAgainst, g.ExpectedGoalsAgainst, g.GoalsSavedAboveExpected)).ToList()
            ),
            new LeagueAveragesDto(result.AvgCorsiPct, result.AvgExpectedGoalsPct)
        );

        return Results.Ok(response);
    }

    private static async Task<IResult> GetTopLines(
        int? season,
        string? situation,
        int? limit,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
        var effectiveSituation = situation ?? "5on5";
        var effectiveLimit = Math.Clamp(limit ?? 5, 1, 20);

        var lines = await statsRepository.GetTopLinesAsync(
            effectiveSeason,
            effectiveSituation,
            effectiveLimit,
            cancellationToken);

        var response = new TopLinesResponseDto(
            effectiveSeason,
            effectiveSituation,
            lines.Select(l => new TopLineDto(
                l.Id,
                l.Team,
                l.Players.Select(p => new LinePlayerDto(p.PlayerId, p.Name, p.Position)).ToList(),
                l.IceTimeSeconds,
                l.ExpectedGoalsPct,
                l.GoalsFor,
                l.GoalsAgainst
            )).ToList()
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
        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
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
            StatsMappers.CalculateBreakoutScore(c)
        )).ToList();

        return Results.Ok(new BreakoutCandidatesDto(
            effectiveSeason,
            effectiveMinGames,
            candidateDtos
        ));
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
            c.PlayerCount,
            c.PointsPer60P25,
            c.PointsPer60P75,
            c.GoalsPer60P25,
            c.GoalsPer60P75,
            c.XgPer60P25,
            c.XgPer60P75
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
                    p.GamesPlayed,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
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

    private static async Task<IResult> GetLeaderboard(
        string? category,
        int? season,
        string? situation,
        int? limit,
        string? sortDir,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return Results.BadRequest("Category is required. Valid categories: points, goals, assists, expectedGoals, corsiPct, iceTime, gamesPlayed, savePct, gaa, gsax, shotsAgainst");
        }

        if (!LeaderboardBuilder.IsValidCategory(category))
        {
            return Results.BadRequest($"Invalid category '{category}'. Valid categories: points, goals, assists, expectedGoals, corsiPct, iceTime, gamesPlayed, savePct, gaa, gsax, shotsAgainst");
        }

        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
        var effectiveSituation = situation ?? "all";
        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);
        var ascending = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        var result = await statsRepository.GetLeaderboardAsync(
            category,
            effectiveSeason,
            effectiveSituation,
            effectiveLimit,
            ascending,
            cancellationToken);

        var response = LeaderboardBuilder.BuildResponse(result, effectiveSeason, effectiveSituation);
        return Results.Ok(response);
    }

    private static async Task<IResult> GetRookies(
        int? season,
        int? minGames,
        int? limit,
        string? position,
        ISkaterStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveSeason = season ?? StatsMappers.GetDefaultSeason();
        var effectiveMinGames = minGames ?? 10;
        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);

        // Normalize position filter
        var effectivePosition = position?.ToUpperInvariant() switch
        {
            "F" or "FORWARDS" => "F",
            "D" or "DEFENSE" or "DEFENSEMEN" => "D",
            _ => null
        };

        var rookies = await statsRepository.GetRookiesAsync(
            effectiveSeason,
            effectiveMinGames,
            effectiveLimit,
            effectivePosition,
            cancellationToken);

        var rookieDtos = rookies.Select(r =>
        {
            var age = r.Player?.BirthDate.HasValue == true
                ? StatsMappers.CalculateAgeAsSept15(r.Player.BirthDate.Value, effectiveSeason)
                : 0;

            var shotsPer60 = r.IceTimeSeconds > 0
                ? Math.Round((decimal)r.Shots / r.IceTimeSeconds * 3600, 2)
                : 0;

            return new RookieDto(
                r.PlayerId,
                r.Player?.Name ?? "Unknown",
                r.Team,
                r.Player?.Position,
                PlayerHelpers.GetHeadshotUrl(r.PlayerId, r.Player?.HeadshotUrl, r.Team),
                age,
                r.GamesPlayed,
                r.Goals,
                r.Assists,
                r.Goals + r.Assists,
                r.Shots,
                Math.Round(r.ExpectedGoals ?? 0, 2),
                Math.Round(r.Goals - (r.ExpectedGoals ?? 0), 2),
                r.CorsiForPct,
                r.FenwickForPct,
                shotsPer60,
                r.IceTimeSeconds,
                StatsMappers.CalculateRookieScore(r, r.Player?.Position, age)
            );
        }).ToList();

        return Results.Ok(new RookiesResponseDto(
            effectiveSeason,
            effectiveMinGames,
            effectivePosition,
            rookieDtos
        ));
    }

    private static async Task<IResult> GetLeagueTrends(
        string? situation,
        IStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var effectiveSituation = situation ?? "all";

        var trends = await statsRepository.GetLeagueTrendsAsync(
            effectiveSituation,
            cancellationToken);

        var seasonDtos = trends.Select(t => new SeasonTrendDto(
            t.Season,
            t.TotalPlayers,
            t.TotalGamesPlayed,
            t.TotalGoals,
            t.TotalAssists,
            t.TotalShots,
            t.TotalExpectedGoals,
            t.AvgCorsiPct,
            t.AvgGoalsPerGame,
            t.AvgAssistsPerGame,
            t.AvgToiPerGame,
            t.AvgXgPer60
        )).ToList();

        return Results.Ok(new LeagueTrendsResponseDto(effectiveSituation, seasonDtos));
    }

    private static async Task<IResult> GetGoalieLeagueBaselines(
        string? seasons,
        string? situation,
        bool? playoffs,
        IDbContextFactory<AppDbContext> dbFactory,
        CancellationToken cancellationToken)
    {
        var effectiveSituation = string.IsNullOrWhiteSpace(situation) ? "all" : situation!;
        var effectivePlayoffs = playoffs ?? false;

        var seasonList = new List<int>();
        if (!string.IsNullOrWhiteSpace(seasons))
        {
            seasonList = seasons
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var year) ? (int?)year : null)
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .Distinct()
                .Order()
                .ToList();
        }

        if (seasonList.Count == 0)
        {
            seasonList.Add(StatsMappers.GetDefaultSeason());
        }

        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var query = db.GoalieSeasons
            .Where(g =>
                seasonList.Contains(g.Season) &&
                g.Situation == effectiveSituation &&
                g.IsPlayoffs == effectivePlayoffs);

        var totals = await query
            .GroupBy(_ => 1)
            .Select(g => new
            {
                LowShots = g.Sum(x => x.LowDangerShots),
                MedShots = g.Sum(x => x.MediumDangerShots),
                HighShots = g.Sum(x => x.HighDangerShots),
                LowGoals = g.Sum(x => x.LowDangerGoals),
                MedGoals = g.Sum(x => x.MediumDangerGoals),
                HighGoals = g.Sum(x => x.HighDangerGoals),
                ExpectedRebounds = g.Sum(x => x.ExpectedRebounds ?? 0m),
                Rebounds = g.Sum(x => x.Rebounds)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (totals is null)
        {
            return Results.Ok(new GoalieLeagueBaselinesDto(
                seasonList,
                effectiveSituation,
                effectivePlayoffs,
                null,
                null,
                null,
                null,
                0,
                0,
                0,
                0,
                0
            ));
        }

        static decimal? CalcSvPct(int shots, int goals) =>
            shots > 0 ? (decimal)(shots - goals) / shots : null;

        var lowSv = CalcSvPct(totals.LowShots, totals.LowGoals);
        var medSv = CalcSvPct(totals.MedShots, totals.MedGoals);
        var highSv = CalcSvPct(totals.HighShots, totals.HighGoals);

        var reboundRatio = totals.ExpectedRebounds > 0
            ? totals.Rebounds / totals.ExpectedRebounds
            : (decimal?)null;

        return Results.Ok(new GoalieLeagueBaselinesDto(
            seasonList,
            effectiveSituation,
            effectivePlayoffs,
            lowSv,
            medSv,
            highSv,
            reboundRatio,
            totals.LowShots,
            totals.MedShots,
            totals.HighShots,
            totals.ExpectedRebounds,
            totals.Rebounds
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
    int SampleSize, // PlayerCount for league, GamesPlayed for individual
    decimal? PointsPer60P25,
    decimal? PointsPer60P75,
    decimal? GoalsPer60P25,
    decimal? GoalsPer60P75,
    decimal? XgPer60P25,
    decimal? XgPer60P75
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

public record OutliersResponseDto(
    int Season,
    string Situation,
    SkaterOutliersDto SkaterOutliers,
    GoalieOutliersDto GoalieOutliers,
    LeagueAveragesDto LeagueAverages
);

public record SkaterOutliersDto(
    IReadOnlyList<OutlierEntryDto> RunningHot,
    IReadOnlyList<OutlierEntryDto> RunningCold
);

public record TopLinesResponseDto(
    int Season,
    string Situation,
    IReadOnlyList<TopLineDto> Lines
);

public record RookieDto(
    int PlayerId,
    string Name,
    string Team,
    string? Position,
    string? HeadshotUrl,
    int Age,
    int GamesPlayed,
    int Goals,
    int Assists,
    int Points,
    int Shots,
    decimal ExpectedGoals,
    decimal GoalsDifferential,
    decimal? CorsiForPct,
    decimal? FenwickForPct,
    decimal ShotsPer60,
    int IceTimeSeconds,
    decimal RookieScore
);

public record RookiesResponseDto(
    int Season,
    int MinGamesPlayed,
    string? PositionFilter,
    IReadOnlyList<RookieDto> Rookies
);
