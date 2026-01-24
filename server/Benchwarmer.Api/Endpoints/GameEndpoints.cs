using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
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
            .WithSummary("Get today's games with live data")
            .WithDescription("""
                Returns all NHL games scheduled for today with live data including:
                - Scheduled start times and team matchups
                - Live scores, period, and time remaining for in-progress games
                - Shots on goal and team records
                - Goal scorers with assists

                Uses ET timezone for "today" calculation (NHL is ET-centric).
                """)
            .Produces<GamesResponseDto>()
            .CacheOutput(CachePolicies.LiveData);

        group.MapGet("/live", GetLiveScores)
            .WithName("GetLiveScores")
            .WithSummary("Get live scores for all games today")
            .WithDescription("""
                Returns live NHL scores with real-time data including:
                - Current period and time remaining
                - Live scores and shots on goal
                - Team records
                - Goal scorers with assists and strength

                Data is fetched directly from NHL API for freshness.
                """)
            .Produces<GamesResponseDto>()
            .CacheOutput(CachePolicies.LiveData);

        group.MapGet("/{gameId}", GetGameById)
            .WithName("GetGameById")
            .WithSummary("Get a specific game by ID")
            .WithDescription("Returns game details and analytics for a specific game.")
            .Produces<GameSummaryDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{gameId}/shots", GetGameShots)
            .WithName("GetGameShots")
            .WithSummary("Get shot data for a specific game")
            .WithDescription("Returns all shots from a game split by team, for shot map visualization.")
            .Produces<GameShotsResponseDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.StaticData);

        group.MapGet("/{gameId}/boxscore", GetGameBoxscore)
            .WithName("GetGameBoxscore")
            .WithSummary("Get boxscore stats for a specific game")
            .WithDescription("Returns player stats from NHL boxscore data, including goals, assists, TOI, hits, etc.")
            .Produces<GameBoxscoreResponseDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.SemiStaticData);

        group.MapGet("/{gameId}/preview", GetGamePreview)
            .WithName("GetGamePreview")
            .WithSummary("Get pre-game analytics preview")
            .WithDescription("""
                Returns pre-game analytics for an upcoming game including:
                - Head-to-head record and last 5 meetings this season
                - Team comparison (xG, CF%, PP%, PK%)
                - Hot/cold players for each team (by goals vs expected goals)
                - Expected goalie matchup (by games played)

                Best used for FUT (future) or PRE (pre-game) games.
                """)
            .Produces<GamePreviewDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{gameId}/goalie-form", GetGoalieRecentForm)
            .WithName("GetGoalieRecentForm")
            .WithSummary("Get recent goalie form for game preview")
            .WithDescription("""
                Returns aggregated stats from the last 5 games for each team's goalies.
                Fetched on-demand from NHL boxscores for recent performance data.

                Intended to be called separately from /preview to allow main preview to load faster.
                """)
            .Produces<GoalieRecentFormResponseDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetGamesByDate(
        string? date,
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
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

        var gamesTask = GetGamesForDate(targetDate, gameRepository, nhlScheduleService, cancellationToken);
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);
        await Task.WhenAll(gamesTask, standingsTask);

        var games = await gamesTask;
        var standings = await standingsTask;

        var h2hData = await ComputeHeadToHeadForGames(games, gameRepository, cancellationToken);
        var gameDtos = await EnrichGamesWithStats(games, gameStatsRepository, standings, h2hData, cancellationToken);

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

        var gamesTask = GetGamesForDate(yesterday, gameRepository, nhlScheduleService, cancellationToken);
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);
        await Task.WhenAll(gamesTask, standingsTask);

        var games = (await gamesTask).Where(g => g.GameState == "OFF").ToList();
        var standings = await standingsTask;

        var h2hData = await ComputeHeadToHeadForGames(games, gameRepository, cancellationToken);
        var gameDtos = await EnrichGamesWithStats(games, gameStatsRepository, standings, h2hData, cancellationToken);

        return Results.Ok(new GamesResponseDto(yesterday, gameDtos));
    }

    private static async Task<IResult> GetTodaysGames(
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowUtc = DateTime.UtcNow;
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, etZone);
        var today = DateOnly.FromDateTime(nowEt);

        var liveScoresTask = nhlScheduleService.GetLiveScoresAsync(cancellationToken);
        var scheduleTask = nhlScheduleService.GetGamesForDateAsync(today, cancellationToken);
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);

        await Task.WhenAll(liveScoresTask, scheduleTask, standingsTask);

        var liveScores = await liveScoresTask;
        var scheduleGames = await scheduleTask;
        var standings = await standingsTask;

        // Filter live scores to only include today's games (NHL scoreboard may include yesterday's late games)
        var todayStr = today.ToString("yyyy-MM-dd");
        var todaysLiveGames = liveScores?.Games.Where(g => g.GameDate == todayStr).ToList() ?? [];

        var liveGameIds = new HashSet<string>(
            todaysLiveGames.Select(g => g.Id.ToString()));

        var allMatchups = new List<(string HomeTeam, string AwayTeam, int Season)>();
        foreach (var g in todaysLiveGames)
        {
            var season = GetSeasonFromGameId(g.Id.ToString());
            allMatchups.Add((g.HomeTeam.Abbrev, g.AwayTeam.Abbrev, season));
        }
        foreach (var g in scheduleGames.Where(g => g.GameDate == today && !liveGameIds.Contains(g.GameId)))
        {
            allMatchups.Add((g.HomeTeamCode, g.AwayTeamCode, g.Season));
        }
        var h2hData = await ComputeHeadToHeadForMatchups(allMatchups, gameRepository, cancellationToken);

        var resultDtos = new List<GameSummaryDto>();

        if (todaysLiveGames.Count > 0)
        {
            var liveDtos = await EnrichLiveGamesWithStats(todaysLiveGames, gameStatsRepository, standings, h2hData, cancellationToken);
            resultDtos.AddRange(liveDtos);
        }

        var missingGames = scheduleGames
            .Where(g => g.GameDate == today && !liveGameIds.Contains(g.GameId))
            .ToList();

        if (missingGames.Count > 0)
        {
            var gamesNeedingScores = missingGames
                .Where(g => g.StartTimeUtc.HasValue && g.StartTimeUtc.Value < nowUtc)
                .ToList();

            if (gamesNeedingScores.Count > 0)
            {
                var boxscoreTasks = gamesNeedingScores.Select(async game =>
                {
                    var boxscore = await nhlScheduleService.GetBoxscoreAsync(game.GameId, cancellationToken);
                    return (game, boxscore);
                });

                var boxscoreResults = await Task.WhenAll(boxscoreTasks);

                foreach (var (game, boxscore) in boxscoreResults)
                {
                    if (boxscore != null)
                    {
                        game.HomeScore = boxscore.HomeTeam.Score;
                        game.AwayScore = boxscore.AwayTeam.Score;
                        game.GameState = boxscore.GameState;
                    }
                }
            }

            await gameRepository.UpsertBatchAsync(missingGames, cancellationToken);
            var missingDtos = await EnrichGamesWithStats(missingGames, gameStatsRepository, standings, h2hData, cancellationToken);
            resultDtos.AddRange(missingDtos);
        }

        resultDtos = resultDtos.OrderBy(g => g.StartTimeUtc ?? "").ToList();

        return Results.Ok(new GamesResponseDto(today, resultDtos));
    }

    private static async Task<IResult> GetLiveScores(
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var liveScores = await nhlScheduleService.GetLiveScoresAsync(cancellationToken);

        if (liveScores == null || liveScores.Games.Count == 0)
        {
            var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
            var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
            return Results.Ok(new GamesResponseDto(DateOnly.FromDateTime(nowEt), []));
        }

        DateOnly.TryParse(liveScores.CurrentDate, out var currentDate);
        var gameDtos = liveScores.Games.Select(g => GameMappers.MapLiveGameToDto(g)).ToList();

        return Results.Ok(new GamesResponseDto(currentDate, gameDtos));
    }

    private static async Task<IResult> GetGameById(
        string gameId,
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);

        var liveScores = await nhlScheduleService.GetLiveScoresAsync(cancellationToken);
        var liveGame = liveScores?.Games.FirstOrDefault(g => g.Id.ToString() == gameId);

        if (liveGame != null)
        {
            var statsTask = gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);
            await Task.WhenAll(statsTask, standingsTask);

            var stats = await statsTask;
            var standings = await standingsTask;

            var season = GetSeasonFromGameId(gameId);
            var h2hData = await ComputeHeadToHeadForMatchups(
                [(liveGame.HomeTeam.Abbrev, liveGame.AwayTeam.Abbrev, season)],
                gameRepository, cancellationToken);
            var h2hKey = $"{liveGame.HomeTeam.Abbrev}-{liveGame.AwayTeam.Abbrev}";
            h2hData.TryGetValue(h2hKey, out var seasonSeries);

            standings.TryGetValue(liveGame.HomeTeam.Abbrev, out var homeStandings);
            standings.TryGetValue(liveGame.AwayTeam.Abbrev, out var awayStandings);

            return Results.Ok(GameMappers.MapLiveGameToDto(liveGame, stats, homeStandings, awayStandings, seasonSeries));
        }

        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);

        if (game == null)
        {
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

        var dbStatsTask = gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);
        await Task.WhenAll(dbStatsTask, standingsTask);

        var dbStats = await dbStatsTask;
        var dbStandings = await standingsTask;

        // Run head-to-head query sequentially to avoid DbContext concurrency issues
        var dbH2hData = await ComputeHeadToHeadForMatchups(
            [(game.HomeTeamCode, game.AwayTeamCode, game.Season)],
            gameRepository, cancellationToken);

        dbStandings.TryGetValue(game.HomeTeamCode, out var dbHomeStandings);
        dbStandings.TryGetValue(game.AwayTeamCode, out var dbAwayStandings);
        var dbH2hKey = $"{game.HomeTeamCode}-{game.AwayTeamCode}";
        dbH2hData.TryGetValue(dbH2hKey, out var dbSeasonSeries);

        List<GameGoalDto>? goals = null;
        if (game.GameState == "OFF")
        {
            var landing = await nhlScheduleService.GetGameLandingAsync(gameId, cancellationToken);
            if (landing?.Summary?.Scoring != null)
            {
                goals = GameMappers.MapLandingGoalsWithGwg(landing, game.HomeTeamCode);
            }
        }

        return Results.Ok(GameMappers.MapToDto(game, dbStats, dbHomeStandings, dbAwayStandings, dbSeasonSeries, goals));
    }

    private static async Task<IResult> GetGameShots(
        string gameId,
        IGameRepository gameRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);
        if (game == null)
        {
            return Results.NotFound();
        }

        var shots = await shotRepository.GetByGameAsync(gameId, cancellationToken);

        var homeShots = shots
            .Where(s => s.IsHomeTeam)
            .Select(GameMappers.MapToShotDto)
            .ToList();

        var awayShots = shots
            .Where(s => !s.IsHomeTeam)
            .Select(GameMappers.MapToShotDto)
            .ToList();

        return Results.Ok(new GameShotsResponseDto(
            gameId,
            game.HomeTeamCode,
            game.AwayTeamCode,
            homeShots,
            awayShots
        ));
    }

    private static async Task<IResult> GetGameBoxscore(
        string gameId,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var boxscore = await nhlScheduleService.GetBoxscoreAsync(gameId, cancellationToken);
        if (boxscore?.PlayerByGameStats == null)
        {
            return Results.NotFound();
        }

        var homeSkaters = GameMappers.MapSkaters(boxscore.PlayerByGameStats.HomeTeam);
        var awaySkaters = GameMappers.MapSkaters(boxscore.PlayerByGameStats.AwayTeam);
        var homeGoalies = GameMappers.MapGoalies(boxscore.PlayerByGameStats.HomeTeam);
        var awayGoalies = GameMappers.MapGoalies(boxscore.PlayerByGameStats.AwayTeam);

        return Results.Ok(new GameBoxscoreResponseDto(
            gameId,
            boxscore.HomeTeam.Abbrev,
            boxscore.AwayTeam.Abbrev,
            homeSkaters,
            awaySkaters,
            homeGoalies,
            awayGoalies
        ));
    }

    private static async Task<IResult> GetGamePreview(
        string gameId,
        IGameRepository gameRepository,
        ITeamSeasonRepository teamSeasonRepository,
        ISkaterStatsRepository skaterStatsRepository,
        IGoalieStatsRepository goalieStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);

        if (game == null)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var nhlGames = await nhlScheduleService.GetGamesForDateRangeAsync(
                today.AddDays(-1),
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

        var homeTeam = game.HomeTeamCode;
        var awayTeam = game.AwayTeamCode;
        var season = game.Season;

        // Run all independent queries in parallel
        var homeTeamGamesTask = nhlScheduleService.GetTeamSeasonGamesAsync(homeTeam, season, cancellationToken);
        var homeTeamStatsTask = teamSeasonRepository.GetByTeamSeasonAsync(homeTeam, season, "all", false, cancellationToken);
        var awayTeamStatsTask = teamSeasonRepository.GetByTeamSeasonAsync(awayTeam, season, "all", false, cancellationToken);
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);
        var specialTeamsTask = nhlScheduleService.GetTeamSpecialTeamsAsync(season, cancellationToken);
        var homeHotPlayersTask = skaterStatsRepository.GetHotPlayersByTeamAsync(homeTeam, season, 3, cancellationToken);
        var awayHotPlayersTask = skaterStatsRepository.GetHotPlayersByTeamAsync(awayTeam, season, 3, cancellationToken);
        var homeGoaliesTask = goalieStatsRepository.GetByTeamSeasonAsync(homeTeam, season, "all", false, cancellationToken);
        var awayGoaliesTask = goalieStatsRepository.GetByTeamSeasonAsync(awayTeam, season, "all", false, cancellationToken);

        await Task.WhenAll(
            homeTeamGamesTask, homeTeamStatsTask, awayTeamStatsTask,
            standingsTask, specialTeamsTask,
            homeHotPlayersTask, awayHotPlayersTask,
            homeGoaliesTask, awayGoaliesTask);

        var homeTeamGames = await homeTeamGamesTask;
        var headToHeadGames = homeTeamGames
            .Where(g => g.GameState == "OFF" && g.GameType == 2)
            .Where(g => g.HomeTeam.Abbrev == awayTeam || g.AwayTeam.Abbrev == awayTeam)
            .OrderByDescending(g => g.GameDate)
            .ToList();

        var homeTeamStats = await homeTeamStatsTask;
        var awayTeamStats = await awayTeamStatsTask;
        var standings = await standingsTask;
        var specialTeams = await specialTeamsTask;

        standings.TryGetValue(homeTeam, out var homeStandings);
        standings.TryGetValue(awayTeam, out var awayStandings);
        specialTeams.TryGetValue(homeTeam, out var homeSpecialTeams);
        specialTeams.TryGetValue(awayTeam, out var awaySpecialTeams);

        var homeHotPlayers = await homeHotPlayersTask;
        var awayHotPlayers = await awayHotPlayersTask;
        var homeGoalies = await homeGoaliesTask;
        var awayGoalies = await awayGoaliesTask;

        var h2hRecord = GamePreviewBuilder.BuildHeadToHeadRecord(headToHeadGames, homeTeam, awayTeam);
        var homeComparison = GamePreviewBuilder.BuildTeamPreviewStats(homeTeam, homeTeamStats, homeStandings, homeSpecialTeams);
        var awayComparison = GamePreviewBuilder.BuildTeamPreviewStats(awayTeam, awayTeamStats, awayStandings, awaySpecialTeams);

        var homeHotPlayerDtos = homeHotPlayers.Select(GameMappers.MapToHotPlayerDto).ToList();
        var awayHotPlayerDtos = awayHotPlayers.Select(GameMappers.MapToHotPlayerDto).ToList();

        var homeGoalieDtos = homeGoalies.Select(GameMappers.MapToGoaliePreviewDto).ToList();
        var awayGoalieDtos = awayGoalies.Select(GameMappers.MapToGoaliePreviewDto).ToList();

        return Results.Ok(new GamePreviewDto(
            Game: new GamePreviewGameDto(
                Id: game.GameId,
                Date: game.GameDate,
                HomeTeam: homeTeam,
                HomeTeamName: GameMappers.GetTeamName(homeTeam),
                AwayTeam: awayTeam,
                AwayTeamName: GameMappers.GetTeamName(awayTeam),
                StartTimeUtc: game.StartTimeUtc?.ToString("o")
            ),
            HeadToHead: h2hRecord,
            TeamComparison: new TeamComparisonDto(homeComparison, awayComparison),
            HotPlayers: new HotPlayersDto(homeHotPlayerDtos, awayHotPlayerDtos),
            GoalieMatchup: new GoalieMatchupDto(
                Home: homeGoalieDtos,
                Away: awayGoalieDtos
            )
        ));
    }

    private static async Task<IResult> GetGoalieRecentForm(
        string gameId,
        IGameRepository gameRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);
        if (game == null)
        {
            return Results.NotFound();
        }

        var homeTeam = game.HomeTeamCode;
        var awayTeam = game.AwayTeamCode;
        var season = game.Season;

        var homeGamesTask = nhlScheduleService.GetTeamSeasonGamesAsync(homeTeam, season, cancellationToken);
        var awayGamesTask = nhlScheduleService.GetTeamSeasonGamesAsync(awayTeam, season, cancellationToken);
        await Task.WhenAll(homeGamesTask, awayGamesTask);

        var homeGames = (await homeGamesTask)
            .Where(g => g.GameState == "OFF" && g.GameType == 2)
            .OrderByDescending(g => g.GameDate)
            .Take(5)
            .ToList();

        var awayGames = (await awayGamesTask)
            .Where(g => g.GameState == "OFF" && g.GameType == 2)
            .OrderByDescending(g => g.GameDate)
            .Take(5)
            .ToList();

        var allGameIds = homeGames.Select(g => g.Id.ToString()).Concat(awayGames.Select(g => g.Id.ToString())).Distinct().ToList();
        var boxscoreTasks = allGameIds.Select(id => nhlScheduleService.GetBoxscoreAsync(id, cancellationToken));
        var boxscores = (await Task.WhenAll(boxscoreTasks))
            .Where(b => b != null)
            .ToDictionary(b => b!.Id.ToString(), b => b!);

        var homeGoalieStats = GamePreviewBuilder.AggregateGoalieStatsFromBoxscores(homeTeam, homeGames, boxscores);
        var awayGoalieStats = GamePreviewBuilder.AggregateGoalieStatsFromBoxscores(awayTeam, awayGames, boxscores);

        return Results.Ok(new GoalieRecentFormResponseDto(
            Home: homeGoalieStats,
            Away: awayGoalieStats
        ));
    }

    #region Helper Methods

    private static async Task<List<Game>> GetGamesForDate(
        DateOnly date,
        IGameRepository gameRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var games = (await gameRepository.GetByDateAsync(date, cancellationToken)).ToList();

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

    private static int GetSeasonFromGameId(string gameId)
    {
        if (gameId.Length >= 4 && int.TryParse(gameId[..4], out var year))
            return year;
        var now = DateTime.UtcNow;
        return now.Month < 9 ? now.Year - 1 : now.Year;
    }

    private static async Task<Dictionary<string, string>> ComputeHeadToHeadForGames(
        List<Game> games,
        IGameRepository gameRepository,
        CancellationToken cancellationToken)
    {
        var matchups = games.Select(g => (g.HomeTeamCode, g.AwayTeamCode, g.Season)).ToList();
        return await ComputeHeadToHeadForMatchups(matchups, gameRepository, cancellationToken);
    }

    private static async Task<Dictionary<string, string>> ComputeHeadToHeadForMatchups(
        List<(string HomeTeam, string AwayTeam, int Season)> matchups,
        IGameRepository gameRepository,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, string>();
        if (matchups.Count == 0) return result;

        var uniqueMatchups = matchups
            .Select(m => (
                TeamA: string.Compare(m.HomeTeam, m.AwayTeam, StringComparison.Ordinal) < 0 ? m.HomeTeam : m.AwayTeam,
                TeamB: string.Compare(m.HomeTeam, m.AwayTeam, StringComparison.Ordinal) < 0 ? m.AwayTeam : m.HomeTeam,
                m.Season))
            .Distinct()
            .ToList();

        var h2hResults = new List<(string TeamA, string TeamB, IReadOnlyList<Game> Games)>();
        foreach (var m in uniqueMatchups)
        {
            var h2hGames = await gameRepository.GetHeadToHeadAsync(m.TeamA, m.TeamB, m.Season, cancellationToken);
            h2hResults.Add((m.TeamA, m.TeamB, h2hGames));
        }

        foreach (var matchup in matchups)
        {
            var key = $"{matchup.HomeTeam}-{matchup.AwayTeam}";
            if (result.ContainsKey(key)) continue;

            var teamA = string.Compare(matchup.HomeTeam, matchup.AwayTeam, StringComparison.Ordinal) < 0 ? matchup.HomeTeam : matchup.AwayTeam;
            var teamB = string.Compare(matchup.HomeTeam, matchup.AwayTeam, StringComparison.Ordinal) < 0 ? matchup.AwayTeam : matchup.HomeTeam;

            var h2h = h2hResults.FirstOrDefault(r => r.TeamA == teamA && r.TeamB == teamB);
            if (h2h.Games == null || h2h.Games.Count == 0)
            {
                result[key] = "";
                continue;
            }

            var completedGames = h2h.Games.Where(g => g.GameState == "OFF").ToList();
            if (completedGames.Count == 0)
            {
                result[key] = "";
                continue;
            }

            var homeWins = 0;
            var awayWins = 0;

            foreach (var game in completedGames)
            {
                var homeScore = game.HomeScore;
                var awayScore = game.AwayScore;
                var gameHomeWon = homeScore > awayScore;

                if (game.HomeTeamCode == matchup.HomeTeam)
                {
                    if (gameHomeWon) homeWins++;
                    else awayWins++;
                }
                else
                {
                    if (gameHomeWon) awayWins++;
                    else homeWins++;
                }
            }

            if (homeWins > awayWins)
                result[key] = $"{matchup.HomeTeam} leads {homeWins}-{awayWins}";
            else if (awayWins > homeWins)
                result[key] = $"{matchup.AwayTeam} leads {awayWins}-{homeWins}";
            else
                result[key] = $"Series tied {homeWins}-{awayWins}";
        }

        return result;
    }

    private static async Task<List<GameSummaryDto>> EnrichGamesWithStats(
        List<Game> games,
        IGameStatsRepository gameStatsRepository,
        IReadOnlyDictionary<string, NhlTeamStandings> standings,
        Dictionary<string, string> h2hData,
        CancellationToken cancellationToken)
    {
        if (games.Count == 0)
            return [];

        var gameIds = games.Select(g => g.GameId).ToList();
        var allStats = await gameStatsRepository.GetGameStatsBatchAsync(gameIds, cancellationToken);
        var statsByGameId = allStats.ToDictionary(s => s.GameId);

        return games.Select(g =>
        {
            var h2hKey = $"{g.HomeTeamCode}-{g.AwayTeamCode}";
            h2hData.TryGetValue(h2hKey, out var seasonSeries);
            standings.TryGetValue(g.HomeTeamCode, out var homeStandings);
            standings.TryGetValue(g.AwayTeamCode, out var awayStandings);
            return GameMappers.MapToDto(g, statsByGameId.GetValueOrDefault(g.GameId), homeStandings, awayStandings, seasonSeries);
        }).ToList();
    }

    private static async Task<List<GameSummaryDto>> EnrichLiveGamesWithStats(
        List<NhlLiveGame> games,
        IGameStatsRepository gameStatsRepository,
        IReadOnlyDictionary<string, NhlTeamStandings> standings,
        Dictionary<string, string> h2hData,
        CancellationToken cancellationToken)
    {
        if (games.Count == 0)
            return [];

        var gameIds = games.Select(g => g.Id.ToString()).ToList();
        var allStats = await gameStatsRepository.GetGameStatsBatchAsync(gameIds, cancellationToken);
        var statsByGameId = allStats.ToDictionary(s => s.GameId);

        return games.Select(g =>
        {
            var h2hKey = $"{g.HomeTeam.Abbrev}-{g.AwayTeam.Abbrev}";
            h2hData.TryGetValue(h2hKey, out var seasonSeries);
            standings.TryGetValue(g.HomeTeam.Abbrev, out var homeStandings);
            standings.TryGetValue(g.AwayTeam.Abbrev, out var awayStandings);
            return GameMappers.MapLiveGameToDto(g, statsByGameId.GetValueOrDefault(g.Id.ToString()), homeStandings, awayStandings, seasonSeries);
        }).ToList();
    }

    #endregion
}
