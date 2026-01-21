using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Services;

namespace Benchwarmer.Api.Endpoints;

public static class GameEndpoints
{
    // Team code to name mapping
    private static readonly Dictionary<string, string> TeamNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ANA"] = "Anaheim Ducks",
        ["ARI"] = "Arizona Coyotes",
        ["BOS"] = "Boston Bruins",
        ["BUF"] = "Buffalo Sabres",
        ["CAR"] = "Carolina Hurricanes",
        ["CBJ"] = "Columbus Blue Jackets",
        ["CGY"] = "Calgary Flames",
        ["CHI"] = "Chicago Blackhawks",
        ["COL"] = "Colorado Avalanche",
        ["DAL"] = "Dallas Stars",
        ["DET"] = "Detroit Red Wings",
        ["EDM"] = "Edmonton Oilers",
        ["FLA"] = "Florida Panthers",
        ["LAK"] = "Los Angeles Kings",
        ["MIN"] = "Minnesota Wild",
        ["MTL"] = "Montreal Canadiens",
        ["NJD"] = "New Jersey Devils",
        ["NSH"] = "Nashville Predators",
        ["NYI"] = "New York Islanders",
        ["NYR"] = "New York Rangers",
        ["OTT"] = "Ottawa Senators",
        ["PHI"] = "Philadelphia Flyers",
        ["PIT"] = "Pittsburgh Penguins",
        ["SEA"] = "Seattle Kraken",
        ["SJS"] = "San Jose Sharks",
        ["STL"] = "St. Louis Blues",
        ["TBL"] = "Tampa Bay Lightning",
        ["TOR"] = "Toronto Maple Leafs",
        ["UTA"] = "Utah Hockey Club",
        ["VAN"] = "Vancouver Canucks",
        ["VGK"] = "Vegas Golden Knights",
        ["WPG"] = "Winnipeg Jets",
        ["WSH"] = "Washington Capitals"
    };

    public static void MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/games")
            .WithTags("Games");

        group.MapGet("/", GetGamesByDate)
            .WithName("GetGamesByDate")
            .WithSummary("Get games for a specific date")
            .WithDescription("""
                Returns all NHL games for the specified date with analytics.
                If no date is provided, returns today's games.

                Query Parameters:
                - date: Date in YYYY-MM-DD format (defaults to today in ET timezone)
                """)
            .Produces<GamesResponseDto>()
            .CacheOutput(CachePolicies.SemiStaticData);

        group.MapGet("/yesterday", GetYesterdaysGames)
            .WithName("GetYesterdaysGames")
            .WithSummary("Get yesterday's completed games with analytics")
            .WithDescription("""
                Returns all completed NHL games from yesterday with detailed analytics including:
                - Final scores and overtime/shootout indicators
                - Shot counts and shots on goal per team
                - Expected goals (xG) and goals vs xG differential
                - Shot quality metrics (average distance)
                - High/medium/low danger chances
                - Period-by-period breakdown

                Uses ET timezone for "yesterday" calculation (NHL is ET-centric).
                Shot analytics are only available if shot data has been imported for the game.
                """)
            .Produces<GamesResponseDto>()
            .CacheOutput(CachePolicies.SemiStaticData);

        group.MapGet("/today", GetTodaysGames)
            .WithName("GetTodaysGames")
            .WithSummary("Get today's games (preview)")
            .WithDescription("""
                Returns all NHL games scheduled for today including:
                - Scheduled start times
                - Team matchups
                - Game state (scheduled, in progress, completed)

                Uses ET timezone for "today" calculation (NHL is ET-centric).
                """)
            .Produces<GamesResponseDto>()
            .CacheOutput(CachePolicies.SearchResults); // 5 min cache for live data

        group.MapGet("/{gameId}", GetGameById)
            .WithName("GetGameById")
            .WithSummary("Get a specific game by ID")
            .WithDescription("Returns game details and analytics for a specific game.")
            .Produces<GameSummaryDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.StaticData);
    }

    private static async Task<IResult> GetGamesByDate(
        string? date,
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        // Parse date or default to today in ET
        DateOnly targetDate;
        if (!string.IsNullOrEmpty(date) && DateOnly.TryParse(date, out var parsedDate))
        {
            targetDate = parsedDate;
        }
        else
        {
            var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
            var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
            targetDate = DateOnly.FromDateTime(nowEt);
        }

        var games = await GetGamesForDate(targetDate, gameRepository, nhlScheduleService, cancellationToken);
        var gameDtos = await EnrichGamesWithStats(games, gameStatsRepository, cancellationToken);

        return Results.Ok(new GamesResponseDto(targetDate, gameDtos));
    }

    private static async Task<IResult> GetYesterdaysGames(
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
        var yesterday = DateOnly.FromDateTime(nowEt.AddDays(-1));

        var games = await GetGamesForDate(yesterday, gameRepository, nhlScheduleService, cancellationToken);
        // Filter to only completed games for yesterday endpoint
        games = games.Where(g => g.GameState == "OFF").ToList();
        var gameDtos = await EnrichGamesWithStats(games, gameStatsRepository, cancellationToken);

        return Results.Ok(new GamesResponseDto(yesterday, gameDtos));
    }

    private static async Task<IResult> GetTodaysGames(
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
        var today = DateOnly.FromDateTime(nowEt);

        var games = await GetGamesForDate(today, gameRepository, nhlScheduleService, cancellationToken);
        var gameDtos = await EnrichGamesWithStats(games, gameStatsRepository, cancellationToken);

        return Results.Ok(new GamesResponseDto(today, gameDtos));
    }

    private static async Task<IResult> GetGameById(
        string gameId,
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);

        // If not in DB, try to fetch from NHL API
        if (game == null)
        {
            // Fetch a week around current date to try to find the game
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var nhlGames = await nhlScheduleService.GetGamesForDateRangeAsync(
                today.AddDays(-7),
                today.AddDays(7),
                cancellationToken);

            game = nhlGames.FirstOrDefault(g => g.GameId == gameId);
            if (game != null)
            {
                await gameRepository.UpsertAsync(game, cancellationToken);
            }
        }

        if (game == null)
        {
            return Results.NotFound();
        }

        var stats = await gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);
        return Results.Ok(MapToDto(game, stats));
    }

    private static async Task<List<Game>> GetGamesForDate(
        DateOnly date,
        IGameRepository gameRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        // First try to get games from our database
        var games = (await gameRepository.GetByDateAsync(date, cancellationToken)).ToList();

        // Determine if we should refresh from NHL API
        // Always refresh for today/tomorrow (games may update), or if no games found
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
        var today = DateOnly.FromDateTime(nowEt);
        var shouldRefresh = games.Count == 0 || date >= today;

        if (shouldRefresh)
        {
            var nhlGames = await nhlScheduleService.GetGamesForDateAsync(date, cancellationToken);
            var dateGames = nhlGames.Where(g => g.GameDate == date).ToList();

            if (dateGames.Count > 0)
            {
                await gameRepository.UpsertBatchAsync(dateGames, cancellationToken);
                games = dateGames;
            }
        }

        return games;
    }

    private static async Task<List<GameSummaryDto>> EnrichGamesWithStats(
        List<Game> games,
        IGameStatsRepository gameStatsRepository,
        CancellationToken cancellationToken)
    {
        if (games.Count == 0)
            return [];

        var gameIds = games.Select(g => g.GameId).ToList();
        var allStats = await gameStatsRepository.GetGameStatsBatchAsync(gameIds, cancellationToken);
        var statsByGameId = allStats.ToDictionary(s => s.GameId);

        return games.Select(g => MapToDto(g, statsByGameId.GetValueOrDefault(g.GameId))).ToList();
    }

    private static string? GetTeamName(string teamCode)
    {
        return TeamNames.TryGetValue(teamCode, out var name) ? name : null;
    }

    private static GameSummaryDto MapToDto(Game game, GameStats? stats)
    {
        var hasShotData = stats != null;
        var isCompleted = game.GameState == "OFF";

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeamCode,
            TeamName: GetTeamName(game.HomeTeamCode),
            Goals: isCompleted ? game.HomeScore : null,
            Shots: stats?.HomeStats.TotalShots,
            ShotsOnGoal: stats?.HomeStats.ShotsOnGoal,
            ExpectedGoals: stats?.HomeStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.HomeStats.GoalsVsXgDiff,
            HighDangerChances: stats?.HomeStats.HighDangerChances,
            MediumDangerChances: stats?.HomeStats.MediumDangerChances,
            LowDangerChances: stats?.HomeStats.LowDangerChances,
            AvgShotDistance: stats?.HomeStats.AvgShotDistance
        );

        var awayDto = new GameTeamDto(
            TeamCode: game.AwayTeamCode,
            TeamName: GetTeamName(game.AwayTeamCode),
            Goals: isCompleted ? game.AwayScore : null,
            Shots: stats?.AwayStats.TotalShots,
            ShotsOnGoal: stats?.AwayStats.ShotsOnGoal,
            ExpectedGoals: stats?.AwayStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.AwayStats.GoalsVsXgDiff,
            HighDangerChances: stats?.AwayStats.HighDangerChances,
            MediumDangerChances: stats?.AwayStats.MediumDangerChances,
            LowDangerChances: stats?.AwayStats.LowDangerChances,
            AvgShotDistance: stats?.AwayStats.AvgShotDistance
        );

        var periods = stats?.Periods.Select(p => new GamePeriodStatsDto(
            p.Period,
            p.HomeShots,
            p.AwayShots,
            p.HomeGoals,
            p.AwayGoals,
            p.HomeXG,
            p.AwayXG
        )).ToList() ?? [];

        return new GameSummaryDto(
            GameId: game.GameId,
            GameDate: game.GameDate,
            GameState: game.GameState,
            StartTimeUtc: game.StartTimeUtc?.ToString("o"),
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodType == "REG" ? null : game.PeriodType,
            Periods: periods,
            HasShotData: hasShotData
        );
    }
}
