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
        ISkaterStatsRepository statsRepository,
        CancellationToken cancellationToken)
    {
        var player = await playerRepository.GetByIdAsync(id, cancellationToken);
        if (player is null)
        {
            return Results.NotFound(ApiError.PlayerNotFound);
        }

        var stats = await statsRepository.GetByPlayerAsync(id, season, situation, cancellationToken);

        var dtos = stats.Select(s => new SkaterStatsDto(
            s.Id,
            s.PlayerId,
            s.Season,
            s.Team,
            s.Situation,
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
