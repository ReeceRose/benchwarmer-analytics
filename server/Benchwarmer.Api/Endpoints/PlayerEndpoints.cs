using Benchwarmer.Api.Dtos;
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
            player.HeadshotUrl,
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
                g.HighDangerGoals
            )).ToList();

            return Results.Ok(new GoaliePlayerStatsDto(id, player.Name, goalieDtos));
        }

        // Return skater stats for non-goalies
        var stats = await skaterStatsRepository.GetByPlayerAsync(id, season, situation, cancellationToken);

        var dtos = stats.Select(s => new SkaterStatsDto(
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
            s.FenwickForPct
        )).ToList();

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

        // Calculate summary statistics
        var totalShots = limitedShots.Count;
        var goals = limitedShots.Count(s => s.IsGoal);
        var shotsOnGoal = limitedShots.Count(s => s.ShotWasOnGoal);
        var shootingPct = totalShots > 0 ? Math.Round((decimal)goals / totalShots * 100, 1) : 0;
        var totalXGoal = limitedShots.Sum(s => s.XGoal ?? 0);
        var goalsAboveExpected = Math.Round(goals - totalXGoal, 2);

        var highDanger = limitedShots.Count(s => s.XGoal > 0.15m);
        var mediumDanger = limitedShots.Count(s => s.XGoal >= 0.06m && s.XGoal <= 0.15m);
        var lowDanger = limitedShots.Count(s => s.XGoal < 0.06m);

        var summary = new ShotSummaryDto(
            totalShots,
            goals,
            shotsOnGoal,
            shootingPct,
            Math.Round(totalXGoal, 2),
            goalsAboveExpected,
            highDanger,
            mediumDanger,
            lowDanger
        );

        return Results.Ok(new PlayerShotsResponseDto(id, player.Name, season, shotDtos, summary));
    }

    private static async Task<IResult> ComparePlayers(
        string ids,
        int? season,
        string? situation,
        IPlayerRepository playerRepository,
        ISkaterStatsRepository statsRepository,
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

        var comparisons = new List<PlayerComparisonDto>();

        foreach (var playerId in playerIds)
        {
            var player = await playerRepository.GetByIdAsync(playerId, cancellationToken);
            if (player is null) continue;

            var stats = await statsRepository.GetByPlayerAsync(playerId, season, situation ?? "all", cancellationToken);
            var latestStat = stats.FirstOrDefault();

            comparisons.Add(new PlayerComparisonDto(
                playerId,
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
                    latestStat.FenwickForPct
                ) : null
            ));
        }

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
    SkaterStatsDto? Stats
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
