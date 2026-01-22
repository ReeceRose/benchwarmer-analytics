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
        var nowUtc = DateTime.UtcNow;
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, etZone);
        var today = DateOnly.FromDateTime(nowEt);

        // Fetch both live scores and schedule in parallel
        var liveScoresTask = nhlScheduleService.GetLiveScoresAsync(cancellationToken);
        var scheduleTask = nhlScheduleService.GetGamesForDateAsync(today, cancellationToken);

        await Task.WhenAll(liveScoresTask, scheduleTask);

        var liveScores = await liveScoresTask;
        var scheduleGames = await scheduleTask;

        // Build a set of game IDs from live scores
        var liveGameIds = new HashSet<string>(
            liveScores?.Games.Select(g => g.Id.ToString()) ?? []);

        // Start with live games (these have real-time data)
        var resultDtos = new List<GameSummaryDto>();

        if (liveScores?.Games.Count > 0)
        {
            var liveDtos = await EnrichLiveGamesWithStats(liveScores.Games, gameStatsRepository, cancellationToken);
            resultDtos.AddRange(liveDtos);
        }

        // Add games from schedule that aren't in live scores (completed games that dropped off)
        var missingGames = scheduleGames
            .Where(g => g.GameDate == today && !liveGameIds.Contains(g.GameId))
            .ToList();

        if (missingGames.Count > 0)
        {
            // For games that have started but aren't in live scores, fetch boxscores in parallel
            var gamesNeedingScores = missingGames
                .Where(g => g.StartTimeUtc.HasValue && g.StartTimeUtc.Value < nowUtc)
                .ToList();

            if (gamesNeedingScores.Count > 0)
            {
                // Fetch all boxscores in parallel
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

            // Upsert to DB to ensure we have latest state
            await gameRepository.UpsertBatchAsync(missingGames, cancellationToken);
            var missingDtos = await EnrichGamesWithStats(missingGames, gameStatsRepository, cancellationToken);
            resultDtos.AddRange(missingDtos);
        }

        // Sort by start time
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
        var gameDtos = liveScores.Games.Select(g => MapLiveGameToDto(g)).ToList();

        return Results.Ok(new GamesResponseDto(currentDate, gameDtos));
    }

    private static async Task<IResult> GetGameById(
        string gameId,
        IGameRepository gameRepository,
        IGameStatsRepository gameStatsRepository,
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        // First check live scores for real-time data
        var liveScores = await nhlScheduleService.GetLiveScoresAsync(cancellationToken);
        var liveGame = liveScores?.Games.FirstOrDefault(g => g.Id.ToString() == gameId);

        if (liveGame != null)
        {
            // Found in live scores - return live data
            var stats = await gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);
            return Results.Ok(MapLiveGameToDto(liveGame, stats));
        }

        // Not in live scores, check database
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);

        // If not in DB, try to fetch from NHL API schedule
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

        var dbStats = await gameStatsRepository.GetGameStatsAsync(gameId, cancellationToken);

        // Fetch goals from landing endpoint for completed games
        List<GameGoalDto>? goals = null;
        if (game.GameState == "OFF")
        {
            var landing = await nhlScheduleService.GetGameLandingAsync(gameId, cancellationToken);
            if (landing?.Summary?.Scoring != null)
            {
                goals = MapLandingGoalsWithGwg(landing, game.HomeTeamCode);
            }
        }

        return Results.Ok(MapToDto(game, dbStats, goals));
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
            .Select(MapToShotDto)
            .ToList();

        var awayShots = shots
            .Where(s => !s.IsHomeTeam)
            .Select(MapToShotDto)
            .ToList();

        return Results.Ok(new GameShotsResponseDto(
            gameId,
            game.HomeTeamCode,
            game.AwayTeamCode,
            homeShots,
            awayShots
        ));
    }

    private static GameShotDto MapToShotDto(Shot shot)
    {
        return new GameShotDto(
            Period: shot.Period,
            GameSeconds: shot.GameTimeSeconds,
            ShooterName: shot.ShooterName,
            ShooterPlayerId: shot.ShooterPlayerId,
            XCoord: shot.ArenaAdjustedXCoord ?? shot.XCoord ?? 0,
            YCoord: shot.ArenaAdjustedYCoord ?? shot.YCoord ?? 0,
            XGoal: shot.XGoal ?? 0,
            IsGoal: shot.IsGoal,
            ShotWasOnGoal: shot.ShotWasOnGoal,
            ShotType: shot.ShotType,
            ShotDistance: shot.ShotDistance ?? 0,
            ShotAngle: shot.ShotAngle ?? 0
        );
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

        var homeSkaters = MapSkaters(boxscore.PlayerByGameStats.HomeTeam);
        var awaySkaters = MapSkaters(boxscore.PlayerByGameStats.AwayTeam);
        var homeGoalies = MapGoalies(boxscore.PlayerByGameStats.HomeTeam);
        var awayGoalies = MapGoalies(boxscore.PlayerByGameStats.AwayTeam);

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

    private static List<BoxscoreSkaterDto> MapSkaters(NhlTeamPlayerStats teamStats)
    {
        var allSkaters = teamStats.Forwards.Concat(teamStats.Defense);
        return allSkaters
            .OrderByDescending(s => s.Points)
            .ThenByDescending(s => s.Goals)
            .ThenByDescending(s => s.ShotsOnGoal)
            .Select(s => new BoxscoreSkaterDto(
                PlayerId: s.PlayerId,
                JerseyNumber: s.SweaterNumber,
                Name: s.Name.Default,
                Position: s.Position,
                Goals: s.Goals,
                Assists: s.Assists,
                Points: s.Points,
                PlusMinus: s.PlusMinus,
                PenaltyMinutes: s.PenaltyMinutes,
                Hits: s.Hits,
                ShotsOnGoal: s.ShotsOnGoal,
                BlockedShots: s.BlockedShots,
                Giveaways: s.Giveaways,
                Takeaways: s.Takeaways,
                TimeOnIce: s.TimeOnIce,
                Shifts: s.Shifts,
                FaceoffPct: s.FaceoffWinningPct * 100
            ))
            .ToList();
    }

    private static List<BoxscoreGoalieDto> MapGoalies(NhlTeamPlayerStats teamStats)
    {
        return teamStats.Goalies
            .OrderByDescending(g => g.Starter)
            .Select(g => new BoxscoreGoalieDto(
                PlayerId: g.PlayerId,
                JerseyNumber: g.SweaterNumber,
                Name: g.Name.Default,
                ShotsAgainst: g.ShotsAgainst,
                Saves: g.Saves,
                GoalsAgainst: g.GoalsAgainst,
                SavePct: g.SavePct,
                TimeOnIce: g.TimeOnIce,
                Starter: g.Starter,
                Decision: g.Decision
            ))
            .ToList();
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

    private static async Task<List<GameSummaryDto>> EnrichLiveGamesWithStats(
        List<NhlLiveGame> games,
        IGameStatsRepository gameStatsRepository,
        CancellationToken cancellationToken)
    {
        if (games.Count == 0)
            return [];

        var gameIds = games.Select(g => g.Id.ToString()).ToList();
        var allStats = await gameStatsRepository.GetGameStatsBatchAsync(gameIds, cancellationToken);
        var statsByGameId = allStats.ToDictionary(s => s.GameId);

        return games.Select(g => MapLiveGameToDto(g, statsByGameId.GetValueOrDefault(g.Id.ToString()))).ToList();
    }

    private static GameSummaryDto MapLiveGameToDto(NhlLiveGame game, GameStats? stats = null)
    {
        var hasShotData = stats != null;
        var isLive = game.GameState is "LIVE" or "CRIT";
        // NHL API returns "FINAL" for completed games, we normalize to "OFF"
        var isCompleted = game.GameState is "OFF" or "FINAL";

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeam.Abbrev,
            TeamName: game.HomeTeam.Name?.Default ?? GetTeamName(game.HomeTeam.Abbrev),
            Goals: isLive || isCompleted ? game.HomeTeam.Score : null,
            Shots: stats?.HomeStats.TotalShots,
            ShotsOnGoal: isLive ? game.HomeTeam.ShotsOnGoal : stats?.HomeStats.ShotsOnGoal,
            ExpectedGoals: stats?.HomeStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.HomeStats.GoalsVsXgDiff,
            HighDangerChances: stats?.HomeStats.HighDangerChances,
            MediumDangerChances: stats?.HomeStats.MediumDangerChances,
            LowDangerChances: stats?.HomeStats.LowDangerChances,
            AvgShotDistance: stats?.HomeStats.AvgShotDistance,
            Record: game.HomeTeam.Record
        );

        var awayDto = new GameTeamDto(
            TeamCode: game.AwayTeam.Abbrev,
            TeamName: game.AwayTeam.Name?.Default ?? GetTeamName(game.AwayTeam.Abbrev),
            Goals: isLive || isCompleted ? game.AwayTeam.Score : null,
            Shots: stats?.AwayStats.TotalShots,
            ShotsOnGoal: isLive ? game.AwayTeam.ShotsOnGoal : stats?.AwayStats.ShotsOnGoal,
            ExpectedGoals: stats?.AwayStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.AwayStats.GoalsVsXgDiff,
            HighDangerChances: stats?.AwayStats.HighDangerChances,
            MediumDangerChances: stats?.AwayStats.MediumDangerChances,
            LowDangerChances: stats?.AwayStats.LowDangerChances,
            AvgShotDistance: stats?.AwayStats.AvgShotDistance,
            Record: game.AwayTeam.Record
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

        var goals = MapGoalsWithGwg(game.Goals, game.HomeTeam.Score, game.AwayTeam.Score, game.HomeTeam.Abbrev, isCompleted);

        DateOnly.TryParse(game.GameDate, out var gameDate);

        // Normalize "FINAL" to "OFF" for frontend consistency
        var normalizedGameState = game.GameState == "FINAL" ? "OFF" : game.GameState;

        return new GameSummaryDto(
            GameId: game.Id.ToString(),
            GameDate: gameDate,
            GameState: normalizedGameState,
            StartTimeUtc: game.StartTimeUtc,
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodDescriptor?.PeriodType == "REG" ? null : game.PeriodDescriptor?.PeriodType,
            Periods: periods,
            HasShotData: hasShotData,
            CurrentPeriod: game.Period,
            TimeRemaining: game.Clock?.TimeRemaining,
            InIntermission: game.Clock?.InIntermission,
            Goals: goals
        );
    }

    private static string? GetTeamName(string teamCode)
    {
        return TeamNames.TryGetValue(teamCode, out var name) ? name : null;
    }

    private static GameSummaryDto MapToDto(Game game, GameStats? stats, List<GameGoalDto>? goals = null)
    {
        var hasShotData = stats != null;
        var isCompleted = game.GameState == "OFF";
        // Show scores if game is completed OR if scores exist (game might have stale state)
        var hasScores = game.HomeScore > 0 || game.AwayScore > 0;

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeamCode,
            TeamName: GetTeamName(game.HomeTeamCode),
            Goals: (isCompleted || hasScores) ? game.HomeScore : null,
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
            Goals: (isCompleted || hasScores) ? game.AwayScore : null,
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

        // Use the actual game state - don't override based on scores
        // Live games have scores too, so we can't assume scores mean "completed"
        var effectiveGameState = game.GameState;

        return new GameSummaryDto(
            GameId: game.GameId,
            GameDate: game.GameDate,
            GameState: effectiveGameState,
            StartTimeUtc: game.StartTimeUtc?.ToString("o"),
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodType == "REG" ? null : game.PeriodType,
            Periods: periods,
            HasShotData: hasShotData,
            Goals: goals
        );
    }

    /// <summary>
    /// Finds the index of the game-winning goal.
    /// The GWG is the goal that gave the winning team a lead they never lost
    /// (i.e., the goal that put them at losingTeamFinalScore + 1).
    /// </summary>
    /// <param name="goals">List of goals with their metadata</param>
    /// <param name="finalHomeScore">Final score for home team</param>
    /// <param name="finalAwayScore">Final score for away team</param>
    /// <returns>Index of the GWG, or null if no clear winner</returns>
    private static int? FindGwgIndex(
        IReadOnlyList<(bool IsHomeGoal, int HomeScoreAfter, int AwayScoreAfter)> goals,
        int finalHomeScore,
        int finalAwayScore)
    {
        var homeWins = finalHomeScore > finalAwayScore;
        var awayWins = finalAwayScore > finalHomeScore;

        // If it's a tie (shouldn't happen in NHL), no GWG
        if (!homeWins && !awayWins)
            return null;

        var losingTeamFinalScore = homeWins ? finalAwayScore : finalHomeScore;

        for (int i = 0; i < goals.Count; i++)
        {
            var goal = goals[i];
            var isWinningTeamGoal = (homeWins && goal.IsHomeGoal) || (awayWins && !goal.IsHomeGoal);

            if (isWinningTeamGoal)
            {
                var winningTeamScoreAfter = goal.IsHomeGoal ? goal.HomeScoreAfter : goal.AwayScoreAfter;
                if (winningTeamScoreAfter == losingTeamFinalScore + 1)
                {
                    return i;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Maps goals from live game data and determines which goal is the GWG.
    /// GWG is only calculated for completed games.
    /// </summary>
    private static List<GameGoalDto> MapGoalsWithGwg(
        List<NhlGameGoal> goals,
        int? finalHomeScore,
        int? finalAwayScore,
        string homeTeamAbbrev,
        bool isGameCompleted)
    {
        if (goals.Count == 0 || finalHomeScore == null || finalAwayScore == null)
            return [];

        // Only calculate GWG for completed games
        int? gwgIndex = null;
        if (isGameCompleted)
        {
            var goalData = goals
                .Select(g => (IsHomeGoal: g.TeamAbbrev == homeTeamAbbrev, HomeScoreAfter: g.HomeScore, AwayScoreAfter: g.AwayScore))
                .ToList();

            gwgIndex = FindGwgIndex(goalData, finalHomeScore.Value, finalAwayScore.Value);
        }

        return goals.Select((g, idx) => new GameGoalDto(
            Period: g.Period,
            TimeInPeriod: g.TimeInPeriod,
            ScorerName: g.Name?.Default ?? $"{g.FirstName?.Default} {g.LastName?.Default}".Trim(),
            ScorerId: g.PlayerId,
            TeamCode: g.TeamAbbrev ?? "",
            Strength: g.Strength ?? g.GoalModifier,
            Assists: g.Assists.Select(a => a.Name?.Default ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList(),
            IsGameWinningGoal: idx == gwgIndex
        )).ToList();
    }

    /// <summary>
    /// Maps goals from landing endpoint and determines which goal is the GWG.
    /// </summary>
    private static List<GameGoalDto> MapLandingGoalsWithGwg(NhlGameLanding landing, string homeTeamCode)
    {
        var allGoals = landing.Summary?.Scoring
            .SelectMany(p => p.Goals)
            .ToList() ?? [];

        if (allGoals.Count == 0)
            return [];

        var finalHomeScore = landing.HomeTeam.Score;
        var finalAwayScore = landing.AwayTeam.Score;

        if (finalHomeScore == null || finalAwayScore == null)
            return allGoals.Select(g => MapLandingGoalToDto(g, false)).ToList();

        var goalData = allGoals
            .Select(g => (IsHomeGoal: g.TeamAbbrev?.Default == homeTeamCode, HomeScoreAfter: g.HomeScore, AwayScoreAfter: g.AwayScore))
            .ToList();

        var gwgIndex = FindGwgIndex(goalData, finalHomeScore.Value, finalAwayScore.Value);

        return allGoals.Select((g, idx) => MapLandingGoalToDto(g, idx == gwgIndex)).ToList();
    }

    private static GameGoalDto MapLandingGoalToDto(NhlScoringGoal g, bool isGwg)
    {
        return new GameGoalDto(
            Period: g.Period,
            TimeInPeriod: g.TimeInPeriod,
            ScorerName: g.Name?.Default ?? $"{g.FirstName?.Default} {g.LastName?.Default}".Trim(),
            ScorerId: g.PlayerId,
            TeamCode: g.TeamAbbrev?.Default ?? "",
            Strength: g.Strength,
            Assists: g.Assists.Select(a => a.Name?.Default ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList(),
            IsGameWinningGoal: isGwg
        );
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
        // First get the game info (try live scores, then DB, then NHL API)
        var game = await gameRepository.GetByGameIdAsync(gameId, cancellationToken);

        if (game == null)
        {
            // Try to fetch from NHL API
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

        // Fetch head-to-head from NHL API (our DB may not have historical games)
        var homeTeamGames = await nhlScheduleService.GetTeamSeasonGamesAsync(homeTeam, season, cancellationToken);
        var headToHeadGames = homeTeamGames
            .Where(g => g.GameState == "OFF" && g.GameType == 2) // Completed regular season games only
            .Where(g => g.HomeTeam.Abbrev == awayTeam || g.AwayTeam.Abbrev == awayTeam)
            .OrderByDescending(g => g.GameDate)
            .ToList();

        // Team stats (all situations needed for comparison)
        var homeTeamStats = await teamSeasonRepository.GetByTeamSeasonAsync(homeTeam, season, "all", false, cancellationToken);
        var awayTeamStats = await teamSeasonRepository.GetByTeamSeasonAsync(awayTeam, season, "all", false, cancellationToken);

        // Fetch official NHL standings (streaks, home/away records, L10) and special teams stats (PP%/PK%)
        var standingsTask = nhlScheduleService.GetStandingsAsync(cancellationToken);
        var specialTeamsTask = nhlScheduleService.GetTeamSpecialTeamsAsync(season, cancellationToken);
        await Task.WhenAll(standingsTask, specialTeamsTask);

        var standings = await standingsTask;
        var specialTeams = await specialTeamsTask;

        standings.TryGetValue(homeTeam, out var homeStandings);
        standings.TryGetValue(awayTeam, out var awayStandings);
        specialTeams.TryGetValue(homeTeam, out var homeSpecialTeams);
        specialTeams.TryGetValue(awayTeam, out var awaySpecialTeams);

        // Hot players
        var homeHotPlayers = await skaterStatsRepository.GetHotPlayersByTeamAsync(homeTeam, season, 3, cancellationToken);
        var awayHotPlayers = await skaterStatsRepository.GetHotPlayersByTeamAsync(awayTeam, season, 3, cancellationToken);

        // Goalies
        var homeGoalies = await goalieStatsRepository.GetByTeamSeasonAsync(homeTeam, season, "all", false, cancellationToken);
        var awayGoalies = await goalieStatsRepository.GetByTeamSeasonAsync(awayTeam, season, "all", false, cancellationToken);

        // Build head-to-head
        var h2hRecord = BuildHeadToHeadRecord(headToHeadGames, homeTeam, awayTeam);

        // Build team comparison
        var homeComparison = BuildTeamPreviewStats(homeTeam, homeTeamStats, homeStandings, homeSpecialTeams);
        var awayComparison = BuildTeamPreviewStats(awayTeam, awayTeamStats, awayStandings, awaySpecialTeams);

        // Build hot players
        var homeHotPlayerDtos = homeHotPlayers.Select(MapToHotPlayerDto).ToList();
        var awayHotPlayerDtos = awayHotPlayers.Select(MapToHotPlayerDto).ToList();

        // Build goalie matchup (all goalies, already sorted by ice time)
        var homeGoalieDtos = homeGoalies.Select(MapToGoaliePreviewDto).ToList();
        var awayGoalieDtos = awayGoalies.Select(MapToGoaliePreviewDto).ToList();

        return Results.Ok(new GamePreviewDto(
            Game: new GamePreviewGameDto(
                Id: game.GameId,
                Date: game.GameDate,
                HomeTeam: homeTeam,
                AwayTeam: awayTeam,
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

    private static HeadToHeadDto BuildHeadToHeadRecord(
        IReadOnlyList<NhlClubScheduleGame> games,
        string homeTeam,
        string awayTeam)
    {
        var homeWins = 0;
        var awayWins = 0;
        var otLosses = 0;

        foreach (var g in games)
        {
            var gameHomeTeam = g.HomeTeam.Abbrev;
            var homeScore = g.HomeTeam.Score ?? 0;
            var awayScore = g.AwayTeam.Score ?? 0;
            var homeWon = homeScore > awayScore;
            var isOt = g.PeriodDescriptor?.PeriodType is "OT" or "SO";

            if (gameHomeTeam == homeTeam)
            {
                if (homeWon) homeWins++;
                else if (isOt) otLosses++;
                else awayWins++;
            }
            else // awayTeam was home in this game
            {
                if (homeWon) awayWins++;
                else if (isOt) otLosses++;
                else homeWins++;
            }
        }

        var lastFive = games.Take(5).Select(g =>
        {
            var homeScore = g.HomeTeam.Score ?? 0;
            var awayScore = g.AwayTeam.Score ?? 0;
            return new PastGameDto(
                Date: DateOnly.Parse(g.GameDate),
                Score: $"{g.HomeTeam.Abbrev} {homeScore} - {g.AwayTeam.Abbrev} {awayScore}",
                Winner: homeScore > awayScore ? g.HomeTeam.Abbrev : g.AwayTeam.Abbrev,
                OvertimeType: g.PeriodDescriptor?.PeriodType is "OT" or "SO" ? g.PeriodDescriptor.PeriodType : null
            );
        }).ToList();

        return new HeadToHeadDto(
            Season: new SeasonRecordDto(homeWins, awayWins, otLosses),
            LastFive: lastFive
        );
    }

    private static TeamPreviewStatsDto BuildTeamPreviewStats(
        string teamCode,
        TeamSeason? allSituation,
        NhlTeamStandings? standings,
        NhlTeamSpecialTeams? specialTeams)
    {
        if (allSituation == null)
        {
            return new TeamPreviewStatsDto(teamCode, 0, 0, 0, null, null, null, null, null, null, null, null);
        }

        var gp = allSituation.GamesPlayed;
        var xgfPerGame = gp > 0 ? Math.Round(allSituation.XGoalsFor / gp, 2) : 0;
        var xgaPerGame = gp > 0 ? Math.Round(allSituation.XGoalsAgainst / gp, 2) : 0;

        // Use official NHL PP% and PK% from NHL Stats API
        decimal? ppPct = specialTeams?.PowerPlayPct != null
            ? Math.Round(specialTeams.PowerPlayPct.Value * 100, 1)
            : null;
        decimal? pkPct = specialTeams?.PenaltyKillPct != null
            ? Math.Round(specialTeams.PenaltyKillPct.Value * 100, 1)
            : null;

        // Build streak string (e.g., "W3", "L2", "OT1")
        string? streak = standings != null && !string.IsNullOrEmpty(standings.StreakCode)
            ? $"{standings.StreakCode}{standings.StreakCount}"
            : null;

        // Build record strings
        string? homeRecord = standings != null
            ? $"{standings.HomeWins}-{standings.HomeLosses}-{standings.HomeOtLosses}"
            : null;
        string? roadRecord = standings != null
            ? $"{standings.RoadWins}-{standings.RoadLosses}-{standings.RoadOtLosses}"
            : null;
        string? last10 = standings != null
            ? $"{standings.L10Wins}-{standings.L10Losses}-{standings.L10OtLosses}"
            : null;

        return new TeamPreviewStatsDto(
            TeamCode: teamCode,
            GamesPlayed: gp,
            XGoalsFor: xgfPerGame,
            XGoalsAgainst: xgaPerGame,
            XGoalsPct: allSituation.XGoalsPercentage,
            CorsiPct: allSituation.CorsiPercentage,
            PowerPlayPct: ppPct,
            PenaltyKillPct: pkPct,
            Streak: streak,
            HomeRecord: homeRecord,
            RoadRecord: roadRecord,
            Last10: last10
        );
    }

    private static HotPlayerDto MapToHotPlayerDto(SkaterSeason s)
    {
        var differential = s.Goals - (s.ExpectedGoals ?? 0);
        var trend = differential > 0 ? "hot" : "cold";

        return new HotPlayerDto(
            PlayerId: s.PlayerId,
            Name: s.Player?.Name ?? $"Player {s.PlayerId}",
            Position: s.Player?.Position,
            Goals: s.Goals,
            Assists: s.Assists,
            ExpectedGoals: s.ExpectedGoals ?? 0,
            Differential: Math.Round(differential, 2),
            Trend: trend
        );
    }

    private static GoaliePreviewDto MapToGoaliePreviewDto(GoalieSeason g)
    {
        return new GoaliePreviewDto(
            PlayerId: g.PlayerId,
            Name: g.Player?.Name ?? $"Goalie {g.PlayerId}",
            GamesPlayed: g.GamesPlayed,
            SavePct: g.SavePercentage,
            GoalsAgainstAvg: g.GoalsAgainstAverage,
            GoalsSavedAboveExpected: g.GoalsSavedAboveExpected
        );
    }
}
