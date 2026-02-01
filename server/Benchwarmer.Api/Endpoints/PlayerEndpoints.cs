using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data.Repositories;
using Microsoft.AspNetCore.Http;

namespace Benchwarmer.Api.Endpoints;

public static class PlayerEndpoints
{
    public static void MapPlayerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/players")
            .WithTags("Players");

        group.MapGet("/", SearchPlayers)
            .WithName("SearchPlayers")
            .WithSummary("Search for players by name")
            .WithDescription("""
                Search for players by name. Returns matching players with basic info (ID, name, position, team).

                **Query Parameters:**
                - `q`: Search query (required) - matches against player names
                - `page`/`pageSize`: Pagination (both required together, max pageSize is 100)
                """)
            .Produces<PlayerSearchResultDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .CacheOutput(CachePolicies.SearchResults);

        group.MapGet("/compare", ComparePlayers)
            .WithName("ComparePlayers")
            .WithSummary("Compare multiple players' stats")
            .WithDescription("""
                Compare statistics for multiple players side-by-side. Useful for radar chart comparisons.

                **Query Parameters:**
                - `ids`: Comma-separated player IDs (required, 2-5 players)
                - `season`: Filter to specific season
                - `situation`: Game situation filter (5on5, all, etc.)
                """)
            .Produces<PlayerComparisonResultDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}", GetPlayerById)
            .WithName("GetPlayerById")
            .WithSummary("Get a player by ID")
            .WithDescription("Returns detailed player information including biographical data, headshot URL, and current team.")
            .Produces<PlayerDetailDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}/stats", GetPlayerStats)
            .WithName("GetPlayerStats")
            .WithSummary("Get statistics for a player")
            .WithDescription("""
                Returns player statistics including goals, assists, shots, expected goals, Corsi%, and Fenwick%.

                **Query Parameters:**
                - `season`: Filter to specific season (e.g., 2024)
                - `situation`: Game situation filter (5on5, 5on4, 4on5, all)

                Returns stats broken down by season, team, and situation.
                """)
            .Produces<PlayerStatsDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}/linemates", GetPlayerLinemates)
            .WithName("GetPlayerLinemates")
            .WithSummary("Get linemate history for a player")
            .WithDescription("""
                Returns all players this player has shared ice time with, aggregated across line combinations.

                Shows total ice time, games played, goals for/against, and expected goals % with each linemate.
                Sorted by total ice time together (descending).
                """)
            .Produces<LinemateHistoryDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}/shots", GetPlayerShots)
            .WithName("GetPlayerShots")
            .WithSummary("Get shot data for a player")
            .WithDescription("""
                Returns shot location data for rink visualization with summary statistics.

                **Query Parameters:**
                - `season`: Filter to specific season (e.g., 2024)
                - `period`: Filter to specific period (1, 2, 3, or 4 for OT)
                - `shotType`: Filter by shot type (WRIST, SLAP, SNAP, BACKHAND, TIP, WRAP, DEFLECTED)
                - `goalsOnly`: If true, only return shots that resulted in goals
                - `limit`: Max shots to return (omit for all shots)
                """)
            .Produces<PlayerShotsResponseDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}/rolling-stats", GetPlayerRollingStats)
            .WithName("GetPlayerRollingStats")
            .WithSummary("Get rolling performance stats for a player")
            .WithDescription("""
                Returns per-game performance data for the last N games, useful for trend analysis.

                **Query Parameters:**
                - `season`: Season to get data from (e.g., 2024)
                - `games`: Number of games to include (default: 20, max: 50)
                """)
            .Produces<PlayerRollingStatsDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{id:int}/workload", GetGoalieWorkload)
            .WithName("GetGoalieWorkload")
            .WithSummary("Get workload statistics for a goalie")
            .WithDescription("""
                Returns goalie workload analysis including games per time window,
                shots against trends, and back-to-back performance splits.

                **Query Parameters:**
                - `season`: Season to analyze (e.g., 2024)
                - `games`: Number of recent games to include (default: 30, max: 50)
                """)
            .Produces<GoalieWorkloadResponseDto>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest)
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> SearchPlayers(
        string? q,
        int? page,
        int? pageSize,
        IPlayerRepository repository,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Results.BadRequest(ApiError.MissingQuery);
        }

        // Validate pagination
        if ((page.HasValue && !pageSize.HasValue) || (!page.HasValue && pageSize.HasValue))
        {
            return Results.BadRequest(ApiError.InvalidPagination);
        }
        if (page.HasValue && page.Value < 1)
        {
            return Results.BadRequest(ApiError.InvalidPage);
        }
        if (pageSize.HasValue && (pageSize.Value < 1 || pageSize.Value > 100))
        {
            return Results.BadRequest(ApiError.InvalidPageSize);
        }

        var (players, totalCount) = await repository.SearchAsync(q, page, pageSize, cancellationToken);

        var dtos = players.Select(p => new PlayerDto(
            p.Id,
            p.Name,
            p.Position,
            p.CurrentTeamAbbreviation
        )).ToList();

        int? totalPages = page.HasValue && pageSize.HasValue
            ? (int)Math.Ceiling((double)totalCount / pageSize.Value)
            : null;

        return Results.Ok(new PlayerSearchResultDto(dtos, totalCount, page, pageSize, totalPages));
    }

    private static async Task<IResult> GetPlayerById(
        int id,
        IPlayerRepository repository,
        CancellationToken cancellationToken)
    {
        var player = await repository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        return Results.Ok(new PlayerDetailDto(
            player.Id,
            player.Name,
            player.FirstName,
            player.LastName,
            player.Position,
            player.CurrentTeamAbbreviation,
            PlayerHelpers.GetHeadshotUrl(player.Id, player.HeadshotUrl, player.CurrentTeamAbbreviation),
            player.BirthDate,
            player.HeightInches,
            player.WeightLbs,
            player.Shoots
        ));
    }

    private static async Task<IResult> GetPlayerStats(
        int id,
        int? season,
        string? situation,
        IPlayerRepository playerRepository,
        ISkaterStatsRepository skaterStatsRepository,
        IGoalieStatsRepository goalieStatsRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        // Check if player is a goalie
        if (player.Position == "G")
        {
            var goalieStats = await goalieStatsRepository.GetByPlayerAsync(id, season, situation, cancellationToken);

            var goalieDtos = goalieStats.Select(g => new GoalieStatsDto(
                g.Id,
                g.PlayerId,
                g.Season,
                g.Team,
                g.Situation,
                g.IsPlayoffs,
                g.GamesPlayed,
                g.IceTimeSeconds,
                g.GoalsAgainst,
                g.ShotsAgainst,
                g.SavePercentage,
                g.GoalsAgainstAverage,
                g.GoalsSavedAboveExpected,
                g.ExpectedGoalsAgainst,
                g.LowDangerShots,
                g.MediumDangerShots,
                g.HighDangerShots,
                g.LowDangerGoals,
                g.MediumDangerGoals,
                g.HighDangerGoals,
                g.ExpectedRebounds,
                g.Rebounds
            )).ToList();

            return Results.Ok(new GoaliePlayerStatsDto(id, player.Name, goalieDtos));
        }

        // Return skater stats for non-goalies
        var stats = await skaterStatsRepository.GetByPlayerAsync(id, season, situation, cancellationToken);
        var advancedStats = await skaterStatsRepository.GetAdvancedByPlayerAsync(id, season, situation, cancellationToken);

        // Create lookup for advanced stats by (Season, Team, Situation, IsPlayoffs)
        var advancedLookup = advancedStats.ToDictionary(
            a => (a.Season, a.Team, a.Situation, a.IsPlayoffs),
            a => a);

        var dtos = stats.Select(s =>
        {
            // Try to find matching advanced stats
            advancedLookup.TryGetValue((s.Season, s.Team, s.Situation, s.IsPlayoffs), out var adv);

            // Calculate zone start percentages (including neutral zone in denominator)
            decimal? ozoneShiftPct = null;
            decimal? dzoneShiftPct = null;
            if (adv?.IFOZoneShiftStarts != null && adv?.IFDZoneShiftStarts != null && adv?.IFNeutralZoneShiftStarts != null)
            {
                var totalZoneStarts = adv.IFOZoneShiftStarts.Value + adv.IFDZoneShiftStarts.Value + adv.IFNeutralZoneShiftStarts.Value;
                if (totalZoneStarts > 0)
                {
                    ozoneShiftPct = Math.Round(adv.IFOZoneShiftStarts.Value / totalZoneStarts * 100, 1);
                    dzoneShiftPct = Math.Round(adv.IFDZoneShiftStarts.Value / totalZoneStarts * 100, 1);
                }
            }

            return new SkaterStatsDto(
                s.Id,
                s.PlayerId,
                s.Season,
                s.Team,
                s.Situation,
                s.IsPlayoffs,
                s.GamesPlayed,
                s.IceTimeSeconds,
                s.Goals,
                s.Assists,
                s.Goals + s.Assists,
                s.Shots,
                s.ExpectedGoals,
                s.ExpectedGoalsPer60,
                s.OnIceShootingPct,
                s.OnIceSavePct,
                s.CorsiForPct,
                s.FenwickForPct,
                adv?.Shifts,
                adv?.IFOZoneShiftStarts,
                adv?.IFDZoneShiftStarts,
                adv?.IFNeutralZoneShiftStarts,
                ozoneShiftPct,
                dzoneShiftPct
            );
        }).ToList();

        return Results.Ok(new PlayerStatsDto(id, player.Name, dtos));
    }

    private static async Task<IResult> GetPlayerLinemates(
        int id,
        int? season,
        string? situation,
        IPlayerRepository playerRepository,
        ILineRepository lineRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        // Query pre-aggregated linemate data from materialized view
        var pairs = await lineRepository.GetLinematesAsync(
            id,
            season ?? DateTime.Now.Year,
            situation,
            cancellationToken);

        var linemates = pairs.Select(p => new LinemateDto(
            p.Player1Id,
            p.Player1Name,
            p.TotalIceTimeSeconds,
            p.GamesPlayed,
            p.GoalsFor,
            p.GoalsAgainst,
            p.ExpectedGoalsPct
        )).ToList();

        return Results.Ok(new LinemateHistoryDto(id, player.Name, linemates));
    }

    private static async Task<IResult> GetPlayerShots(
        int id,
        int? season,
        int? period,
        string? shotType,
        bool? goalsOnly,
        int? limit,
        IPlayerRepository playerRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        // If no limit specified, return all shots (null passes through to repository)
        var effectiveLimit = limit;

        var shots = await shotRepository.GetByPlayerAsync(
            id,
            season,
            period,
            shotType,
            goalsOnly,
            effectiveLimit,
            cancellationToken);

        var limitedShots = shots.ToList();

        var shotDtos = limitedShots.Select(s => new ShotDto(
            s.ShotId,
            s.ShooterPlayerId,
            s.ShooterName,
            s.ShooterPosition,
            s.Period,
            s.GameTimeSeconds,
            s.ArenaAdjustedXCoord,
            s.ArenaAdjustedYCoord,
            s.ShotDistance,
            s.ShotAngle,
            s.ShotType,
            s.IsGoal,
            s.ShotWasOnGoal,
            s.ShotOnEmptyNet,
            s.ShotRebound,
            s.ShotRush,
            s.XGoal,
            s.HomeSkatersOnIce,
            s.AwaySkatersOnIce,
            s.GameId
        )).ToList();

        // Calculate summary statistics (centralized to keep danger thresholds consistent)
        var summary = ShotMappers.CalculateSummary(limitedShots);

        return Results.Ok(new PlayerShotsResponseDto(id, player.Name, season, shotDtos, summary));
    }

    private static async Task<IResult> GetPlayerRollingStats(
        int id,
        int? season,
        int? games,
        IPlayerRepository playerRepository,
        IShotRepository shotRepository,
        ISkaterStatsRepository skaterStatsRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        // Default to current season
        var effectiveSeason = season ?? DateTime.Now.Year;
        var gameLimit = Math.Clamp(games ?? 20, 1, 50);

        // Get recent shots grouped by game
        var recentShots = await shotRepository.GetRecentByPlayerAsync(
            id, effectiveSeason, gameLimit, cancellationToken);

        if (recentShots.Count == 0)
        {
            return Results.Ok(new PlayerRollingStatsDto(
                id, player.Name, effectiveSeason, 0, [],
                0, 0, 0, 0, 0, 0, 0, 0, "neutral"));
        }

        // Group shots by game
        var gameGroups = recentShots
            .GroupBy(s => s.GameId)
            .OrderByDescending(g => g.Key)
            .Select(g => new GameStatsDto(
                g.Key,
                g.Count(s => s.IsGoal),
                g.Count(),
                Math.Round(g.Sum(s => s.XGoal ?? 0), 2),
                g.Count() > 0 ? Math.Round((decimal)g.Count(s => s.IsGoal) / g.Count() * 100, 1) : 0
            ))
            .ToList();

        var gamesIncluded = gameGroups.Count;

        // Calculate rolling totals
        var rollingGoals = gameGroups.Sum(g => g.Goals);
        var rollingShots = gameGroups.Sum(g => g.Shots);
        var rollingXg = gameGroups.Sum(g => g.ExpectedGoals);

        var rollingGoalsPerGame = gamesIncluded > 0 ? Math.Round((decimal)rollingGoals / gamesIncluded, 2) : 0;
        var rollingShotsPerGame = gamesIncluded > 0 ? Math.Round((decimal)rollingShots / gamesIncluded, 2) : 0;
        var rollingXgPerGame = gamesIncluded > 0 ? Math.Round(rollingXg / gamesIncluded, 2) : 0;
        var rollingShootingPct = rollingShots > 0 ? Math.Round((decimal)rollingGoals / rollingShots * 100, 1) : 0;

        // Get season stats for comparison
        var seasonStats = await skaterStatsRepository.GetByPlayerAsync(
            id, effectiveSeason, "all", cancellationToken);
        var seasonStat = seasonStats.FirstOrDefault(s => !s.IsPlayoffs);

        decimal seasonGoalsPerGame = 0, seasonShotsPerGame = 0, seasonXgPerGame = 0, seasonShootingPct = 0;
        if (seasonStat?.GamesPlayed > 0)
        {
            seasonGoalsPerGame = Math.Round((decimal)seasonStat.Goals / seasonStat.GamesPlayed, 2);
            seasonShotsPerGame = Math.Round((decimal)seasonStat.Shots / seasonStat.GamesPlayed, 2);
            seasonXgPerGame = seasonStat.ExpectedGoals.HasValue
                ? Math.Round(seasonStat.ExpectedGoals.Value / seasonStat.GamesPlayed, 2)
                : 0;
            seasonShootingPct = seasonStat.Shots > 0
                ? Math.Round((decimal)seasonStat.Goals / seasonStat.Shots * 100, 1)
                : 0;
        }

        // Determine trend
        var trend = "neutral";
        if (seasonGoalsPerGame > 0)
        {
            var ratio = rollingGoalsPerGame / seasonGoalsPerGame;
            if (ratio > 1.2m) trend = "hot";
            else if (ratio < 0.8m) trend = "cold";
        }

        return Results.Ok(new PlayerRollingStatsDto(
            id,
            player.Name,
            effectiveSeason,
            gamesIncluded,
            gameGroups,
            seasonGoalsPerGame,
            seasonShotsPerGame,
            seasonXgPerGame,
            seasonShootingPct,
            rollingGoalsPerGame,
            rollingShotsPerGame,
            rollingXgPerGame,
            rollingShootingPct,
            trend
        ));
    }

    private static async Task<IResult> GetGoalieWorkload(
        int id,
        int? season,
        int? games,
        IPlayerRepository playerRepository,
        IShotRepository shotRepository,
        IGameRepository gameRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        if (player.Position != "G")
        {
            return Results.BadRequest(new { error = "Player is not a goalie" });
        }

        var effectiveSeason = season ?? DateTime.Now.Year;
        var gameLimit = Math.Clamp(games ?? 30, 1, 50);

        // Get recent shots faced by this goalie
        var recentShots = await shotRepository.GetRecentByGoalieAsync(
            id, effectiveSeason, gameLimit, cancellationToken);

        if (recentShots.Count == 0)
        {
            return Results.Ok(new GoalieWorkloadResponseDto(
                id, player.Name, effectiveSeason, 0, [],
                GoalieWorkloadBuilder.EmptyWorkloadWindow(7),
                GoalieWorkloadBuilder.EmptyWorkloadWindow(14),
                GoalieWorkloadBuilder.EmptyWorkloadWindow(30),
                GoalieWorkloadBuilder.EmptyBackToBackSplits(), "light"));
        }

        // Get game dates for back-to-back detection
        var gameIds = recentShots.Select(s => s.GameId).Distinct().ToList();
        var gamesData = await gameRepository.GetByGameIdsAsync(gameIds, cancellationToken);
        var gameDateMap = gamesData.ToDictionary(g => g.GameId, g => g);

        // If we're missing game date data, try to estimate from game ordering
        // Game IDs can be either full NHL format (YYYYTTNNNN) or short format (just the game number)
        // We can estimate approximate dates based on game progression
        if (gameDateMap.Count < gameIds.Count)
        {
            // Fall back to estimating dates based on current season schedule
            // Assume ~180 game days in a season (Oct 1 - Apr 15), ~1300 games total
            // Game number / total games * season days gives rough date estimate
            var seasonStart = new DateOnly(effectiveSeason, 10, 1);
            foreach (var gameId in gameIds.Where(id => !gameDateMap.ContainsKey(id)))
            {
                int? gameNum = null;

                // Try to parse game number - handle both full and short formats
                if (gameId.Length >= 10 && int.TryParse(gameId[6..], out var fullFormatNum))
                {
                    // Full NHL format: YYYYTTNNNN (e.g., 2025020752)
                    gameNum = fullFormatNum;
                }
                else if (int.TryParse(gameId, out var shortFormatNum))
                {
                    // Short format: just the game number (e.g., 20752)
                    // The first digit(s) indicate game type: 2 = regular season
                    // Extract just the game sequence number (last 4 digits typically)
                    gameNum = shortFormatNum % 10000;
                }

                if (gameNum.HasValue)
                {
                    // Estimate: game 1 = Oct 1, game 1312 = Apr 15 (197 days)
                    var estimatedDays = (int)(gameNum.Value / 1312.0 * 197);
                    var estimatedDate = seasonStart.AddDays(estimatedDays);
                    // Create a synthetic game entry for date lookup
                    gameDateMap[gameId] = new Data.Entities.Game
                    {
                        GameId = gameId,
                        GameDate = estimatedDate,
                        Season = effectiveSeason,
                        HomeTeamCode = "",
                        AwayTeamCode = "",
                        GameState = "EST" // Mark as estimated
                    };
                }
            }
        }

        // Group shots by game and calculate per-game stats
        var gameStats = GoalieWorkloadBuilder.CalculateGoaliePerGameStats(recentShots, gameDateMap);

        // Detect back-to-backs
        GoalieWorkloadBuilder.MarkBackToBackGames(gameStats);

        // Calculate window stats - use the most recent game date as reference
        // (handles historical seasons where "today" would make all games >30 days old)
        var referenceDate = gameStats.Count > 0 && gameStats[0].GameDate != DateOnly.MinValue
            ? gameStats[0].GameDate
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var last7Days = GoalieWorkloadBuilder.CalculateWindowStats(gameStats, referenceDate, 7);
        var last14Days = GoalieWorkloadBuilder.CalculateWindowStats(gameStats, referenceDate, 14);
        var last30Days = GoalieWorkloadBuilder.CalculateWindowStats(gameStats, referenceDate, 30);

        // Calculate B2B splits
        var b2bSplits = GoalieWorkloadBuilder.CalculateBackToBackSplits(gameStats);

        // Determine trend
        var trend = GoalieWorkloadBuilder.DetermineWorkloadTrend(last7Days);

        return Results.Ok(new GoalieWorkloadResponseDto(
            id, player.Name, effectiveSeason, gameStats.Count, gameStats,
            last7Days, last14Days, last30Days, b2bSplits, trend));
    }

    private static async Task<IResult> ComparePlayers(
        string ids,
        int? season,
        string? situation,
        IPlayerRepository playerRepository,
        ISkaterStatsRepository statsRepository,
        IGoalieStatsRepository goalieStatsRepository,
        CancellationToken cancellationToken)
    {
        var playerIds = ids.Split(',')
            .Select(s => int.TryParse(s.Trim(), out var id) ? id : (int?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();

        if (playerIds.Count < 2)
        {
            return Results.BadRequest(ApiError.InsufficientPlayers);
        }

        if (playerIds.Count > 5)
        {
            return Results.BadRequest(ApiError.TooManyPlayers);
        }

        // Fetch all players in parallel
        var playerTasks = playerIds.Select(id => playerRepository.GetByIdAsync(id, cancellationToken)).ToList();
        await Task.WhenAll(playerTasks);

        var players = (await Task.WhenAll(playerTasks))
            .Where(p => p is not null)
            .Select(p => p!)
            .ToList();

        if (players.Count < 2)
        {
            return Results.BadRequest(ApiError.InsufficientPlayers);
        }

        // Fetch stats for all players in parallel
        var statsTasks = players.Select(async player =>
        {
            if (player.Position == "G")
            {
                var goalieStats = await goalieStatsRepository.GetByPlayerAsync(player.Id, season, situation ?? "all", cancellationToken);
                return (Player: player, SkaterStats: (IReadOnlyList<Benchwarmer.Data.Entities.SkaterSeason>?)null, GoalieStats: goalieStats);
            }
            else
            {
                var skaterStats = await statsRepository.GetByPlayerAsync(player.Id, season, situation ?? "all", cancellationToken);
                return (Player: player, SkaterStats: skaterStats, GoalieStats: (IReadOnlyList<Benchwarmer.Data.Entities.GoalieSeason>?)null);
            }
        }).ToList();

        var allStats = await Task.WhenAll(statsTasks);

        var comparisons = allStats.Select(item =>
        {
            var player = item.Player;

            if (player.Position == "G" && item.GoalieStats is not null)
            {
                var latestGoalieStat = item.GoalieStats
                    .Where(s => !s.IsPlayoffs)
                    .OrderByDescending(s => s.Season)
                    .FirstOrDefault() ?? item.GoalieStats.FirstOrDefault();

                return new PlayerComparisonDto(
                    player.Id,
                    player.Name,
                    player.Position,
                    player.CurrentTeamAbbreviation,
                    null,
                    latestGoalieStat is not null ? new GoalieStatsDto(
                        latestGoalieStat.Id,
                        latestGoalieStat.PlayerId,
                        latestGoalieStat.Season,
                        latestGoalieStat.Team,
                        latestGoalieStat.Situation,
                        latestGoalieStat.IsPlayoffs,
                        latestGoalieStat.GamesPlayed,
                        latestGoalieStat.IceTimeSeconds,
                        latestGoalieStat.GoalsAgainst,
                        latestGoalieStat.ShotsAgainst,
                        latestGoalieStat.SavePercentage,
                        latestGoalieStat.GoalsAgainstAverage,
                        latestGoalieStat.GoalsSavedAboveExpected,
                        latestGoalieStat.ExpectedGoalsAgainst,
                        latestGoalieStat.LowDangerShots,
                        latestGoalieStat.MediumDangerShots,
                        latestGoalieStat.HighDangerShots,
                        latestGoalieStat.LowDangerGoals,
                        latestGoalieStat.MediumDangerGoals,
                        latestGoalieStat.HighDangerGoals,
                        latestGoalieStat.ExpectedRebounds,
                        latestGoalieStat.Rebounds
                    ) : null
                );
            }
            else
            {
                var latestStat = item.SkaterStats?
                    .Where(s => !s.IsPlayoffs)
                    .OrderByDescending(s => s.ExpectedGoals.HasValue)
                    .ThenByDescending(s => s.Season)
                    .FirstOrDefault() ?? item.SkaterStats?.FirstOrDefault();

                return new PlayerComparisonDto(
                    player.Id,
                    player.Name,
                    player.Position,
                    player.CurrentTeamAbbreviation,
                    latestStat is not null ? new SkaterStatsDto(
                        latestStat.Id,
                        latestStat.PlayerId,
                        latestStat.Season,
                        latestStat.Team,
                        latestStat.Situation,
                        latestStat.IsPlayoffs,
                        latestStat.GamesPlayed,
                        latestStat.IceTimeSeconds,
                        latestStat.Goals,
                        latestStat.Assists,
                        latestStat.Goals + latestStat.Assists,
                        latestStat.Shots,
                        latestStat.ExpectedGoals,
                        latestStat.ExpectedGoalsPer60,
                        latestStat.OnIceShootingPct,
                        latestStat.OnIceSavePct,
                        latestStat.CorsiForPct,
                        latestStat.FenwickForPct,
                        null, null, null, null, null, null  // Shift quality fields not needed for comparison
                    ) : null,
                    null
                );
            }
        }).ToList();

        return Results.Ok(new PlayerComparisonResultDto(season, situation ?? "all", comparisons));
    }
}

public record LinemateDto(
    int PlayerId,
    string PlayerName,
    int TotalIceTimeSeconds,
    int GamesPlayed,
    int GoalsFor,
    int GoalsAgainst,
    decimal? ExpectedGoalsPct
);

public record LinemateHistoryDto(
    int PlayerId,
    string PlayerName,
    IReadOnlyList<LinemateDto> Linemates
);

public record PlayerComparisonDto(
    int PlayerId,
    string Name,
    string? Position,
    string? Team,
    SkaterStatsDto? Stats,
    GoalieStatsDto? GoalieStats
);

public record PlayerComparisonResultDto(
    int? Season,
    string Situation,
    IReadOnlyList<PlayerComparisonDto> Players
);

public record PlayerShotsResponseDto(
    int PlayerId,
    string PlayerName,
    int? Season,
    IReadOnlyList<ShotDto> Shots,
    ShotSummaryDto Summary
);

public record GameStatsDto(
    string GameId,
    int Goals,
    int Shots,
    decimal ExpectedGoals,
    decimal ShootingPct
);

public record PlayerRollingStatsDto(
    int PlayerId,
    string PlayerName,
    int Season,
    int GamesIncluded,
    IReadOnlyList<GameStatsDto> Games,
    decimal SeasonGoalsPerGame,
    decimal SeasonShotsPerGame,
    decimal SeasonXgPerGame,
    decimal SeasonShootingPct,
    decimal RollingGoalsPerGame,
    decimal RollingShotsPerGame,
    decimal RollingXgPerGame,
    decimal RollingShootingPct,
    string Trend // "hot", "cold", "neutral"
);
