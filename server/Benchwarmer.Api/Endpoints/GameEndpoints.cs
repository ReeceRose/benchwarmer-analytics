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
        return Results.Ok(MapToDto(game, dbStats));
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

        var goals = game.Goals.Select(g => new GameGoalDto(
            Period: g.Period,
            TimeInPeriod: g.TimeInPeriod,
            ScorerName: g.Name?.Default ?? $"{g.FirstName?.Default} {g.LastName?.Default}".Trim(),
            ScorerId: g.PlayerId,
            TeamCode: g.TeamAbbrev ?? "",
            Strength: g.Strength ?? g.GoalModifier,
            Assists: g.Assists.Select(a => a.Name?.Default ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList()
        )).ToList();

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

    private static GameSummaryDto MapToDto(Game game, GameStats? stats)
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

        // If we have scores but state isn't OFF, treat as completed
        var effectiveGameState = (hasScores && game.GameState != "OFF") ? "OFF" : game.GameState;

        return new GameSummaryDto(
            GameId: game.GameId,
            GameDate: game.GameDate,
            GameState: effectiveGameState,
            StartTimeUtc: game.StartTimeUtc?.ToString("o"),
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodType == "REG" ? null : game.PeriodType,
            Periods: periods,
            HasShotData: hasShotData
        );
    }
}
