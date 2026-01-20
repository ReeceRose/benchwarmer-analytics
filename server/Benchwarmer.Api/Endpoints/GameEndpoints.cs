using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Services;

namespace Benchwarmer.Api.Endpoints;

public static class GameEndpoints
{
    public static void MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/games")
            .WithTags("Games");

        group.MapGet("/yesterday", GetYesterdaysGames)
            .WithName("GetYesterdaysGames")
            .WithSummary("Get yesterday's games with analytics")
            .WithDescription("""
                Returns all NHL games from yesterday with detailed analytics including:
                - Final scores and overtime/shootout indicators
                - Shot counts and shots on goal per team
                - Expected goals (xG) and goals vs xG differential
                - Shot quality metrics (average distance)
                - High/medium/low danger chances
                - Period-by-period breakdown

                Uses ET timezone for "yesterday" calculation (NHL is ET-centric).
                Shot analytics are only available if shot data has been imported for the game.
                """)
            .Produces<YesterdaysGamesDto>()
            .CacheOutput(CachePolicies.SemiStaticData);

        group.MapGet("/{gameId}", GetGameById)
            .WithName("GetGameById")
            .WithSummary("Get a specific game by ID")
            .WithDescription("Returns game details and analytics for a specific game.")
            .Produces<GameSummaryDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.StaticData);
    }

    private static async Task<IResult> GetYesterdaysGames(
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        // Calculate "yesterday" in ET (NHL timezone)
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
        var yesterday = DateOnly.FromDateTime(nowEt.AddDays(-1));

        // First try to get games from our database
        var games = await gameRepository.GetCompletedByDateAsync(yesterday, cancellationToken);

        // If no games found, try fetching from NHL API and saving them
        if (games.Count == 0)
        {
            var nhlGames = await nhlScheduleService.GetGamesForDateAsync(yesterday, cancellationToken);
            var completedGames = nhlGames.Where(g => g.GameState == "OFF" && g.GameDate == yesterday).ToList();

            if (completedGames.Count > 0)
            {
                await gameRepository.UpsertBatchAsync(completedGames, cancellationToken);
                games = completedGames;
            }
        }

        if (games.Count == 0)
        {
            return Results.Ok(new YesterdaysGamesDto(yesterday, []));
        }

        // Get shot stats for all games
        var gameIds = games.Select(g => g.GameId).ToList();
        var allStats = await gameStatsRepository.GetGameStatsBatchAsync(gameIds, cancellationToken);
        var statsByGameId = allStats.ToDictionary(s => s.GameId);

        var gameDtos = games.Select(g => MapToDto(g, statsByGameId.GetValueOrDefault(g.GameId))).ToList();

        return Results.Ok(new YesterdaysGamesDto(yesterday, gameDtos));
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
            // Parse game ID to get approximate date range
            // Game ID format: SSSSTTGGGG where SSSS is season
            if (gameId.Length >= 4 && int.TryParse(gameId[..4], out var season))
            {
                // Fetch a week around current date to try to find the game
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var nhlGames = await nhlScheduleService.GetGamesForDateRangeAsync(
                    today.AddDays(-7),
                    today,
                    cancellationToken);

                game = nhlGames.FirstOrDefault(g => g.GameId == gameId);
                if (game != null)
                {
                    await gameRepository.UpsertAsync(game, cancellationToken);
                }
            }
        }

        if (game == null)
        {
            return Results.NotFound();
        }

        var stats = await gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);
        return Results.Ok(MapToDto(game, stats));
    }

    private static GameSummaryDto MapToDto(Game game, GameStats? stats)
    {
        var hasShotData = stats != null;

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeamCode,
            Goals: game.HomeScore,
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
            Goals: game.AwayScore,
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
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodType == "REG" ? null : game.PeriodType,
            Periods: periods,
            HasShotData: hasShotData
        );
    }
}
