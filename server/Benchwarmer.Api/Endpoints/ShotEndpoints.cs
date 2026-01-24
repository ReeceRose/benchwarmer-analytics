using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data.Repositories;

namespace Benchwarmer.Api.Endpoints;

public static class ShotEndpoints
{

    public static void MapShotEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/teams/{abbrev}/shots")
            .WithTags("Shots");

        group.MapGet("/", GetTeamShots)
            .WithName("GetTeamShots")
            .WithSummary("Get shot data for a team")
            .WithDescription("""
                Returns shot location data for rink visualization with summary statistics.

                **Query Parameters:**
                - `season`: Season year (required, e.g., 2024 for 2024-25 season)
                - `playoffs`: Filter by season type (true = playoffs, false = regular season)
                - `period`: Filter by period (1, 2, 3, 4+ for OT)
                - `shotType`: Filter by shot type (WRIST, SLAP, SNAP, BACKHAND, TIP, WRAP, DEFLECTED)
                - `playerId`: Filter by shooter player ID
                - `goalsOnly`: Only return goals (true/false)
                - `scoreState`: Filter by game score state (leading, trailing, tied)
                - `limit`: Max shots to return (omit for all shots)
                """)
            .Produces<TeamShotsResponseDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/shooters", GetShooterStats)
            .WithName("GetShooterStats")
            .WithSummary("Get per-shooter shot statistics")
            .WithDescription("""
                Returns shot statistics grouped by shooter for the team.

                **Query Parameters:**
                - `season`: Season year (required)
                - `playoffs`: Filter by season type
                """)
            .Produces<IReadOnlyList<ShooterStatsDto>>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/against", GetShotsAgainst)
            .WithName("GetShotsAgainst")
            .WithSummary("Get shots against the team (defensive)")
            .WithDescription("""
                Returns shot location data for shots taken AGAINST the team (opponent shots).
                Used for defensive heat maps showing where teams are allowing shots.

                **Query Parameters:**
                - `season`: Season year (required, e.g., 2024 for 2024-25 season)
                - `playoffs`: Filter by season type (true = playoffs, false = regular season)
                - `period`: Filter by period (1, 2, 3, 4+ for OT)
                - `shotType`: Filter by shot type (WRIST, SLAP, SNAP, BACKHAND, TIP, WRAP, DEFLECTED)
                - `goalsOnly`: Only return goals (true/false)
                - `scoreState`: Filter by game score state (leading, trailing, tied)
                - `limit`: Max shots to return (omit for all shots)
                """)
            .Produces<TeamShotsResponseDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetTeamShots(
        string abbrev,
        int season,
        bool? playoffs,
        int? period,
        string? shotType,
        int? playerId,
        bool? goalsOnly,
        string? scoreState,
        int? limit,
        ITeamRepository teamRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        // Validate shot type
        if (shotType != null && !ShotMappers.ValidShotTypes.Contains(shotType.ToUpperInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidShotType(ShotMappers.ValidShotTypes));
        }

        // Validate score state
        if (scoreState != null && !ShotMappers.ValidScoreStates.Contains(scoreState.ToLowerInvariant()))
        {
            return Results.BadRequest(new ApiError("InvalidScoreState", $"Invalid score state. Valid values: {string.Join(", ", ShotMappers.ValidScoreStates)}"));
        }

        // If no limit specified, return all shots (null passes through to repository)
        var effectiveLimit = limit;

        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var shots = await shotRepository.GetByTeamAsync(
            abbrev,
            season,
            playoffs,
            period,
            shotType?.ToUpperInvariant(),
            playerId,
            scoreState,
            effectiveLimit,
            cancellationToken);

        // Filter goals only if requested (done in memory since repo doesn't support this filter)
        var filteredShots = goalsOnly == true
            ? shots.Where(s => s.IsGoal).ToList()
            : shots.ToList();

        var shotDtos = ShotMappers.MapToDto(filteredShots);
        var summary = ShotMappers.CalculateSummary(filteredShots);

        return Results.Ok(new TeamShotsResponseDto(abbrev, season, playoffs, shotDtos, summary));
    }

    private static async Task<IResult> GetShooterStats(
        string abbrev,
        int season,
        bool? playoffs,
        ITeamRepository teamRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        // Get all shots for aggregation (no limit)
        var shots = await shotRepository.GetByTeamAsync(
            abbrev,
            season,
            playoffs,
            null, // period
            null, // shotType
            null, // playerId
            null, // scoreState
            null, // no limit for aggregation
            cancellationToken);

        // Group by shooter and calculate stats
        var shooterStats = shots
            .Where(s => s.ShooterPlayerId.HasValue)
            .GroupBy(s => new { s.ShooterPlayerId, s.ShooterName, s.ShooterPosition })
            .Select(g => ShotMappers.CalculateShooterStats(
                g.Key.ShooterPlayerId!.Value,
                g.Key.ShooterName ?? "Unknown",
                g.Key.ShooterPosition,
                g))
            .OrderByDescending(s => s.Shots)
            .ToList();

        return Results.Ok(shooterStats);
    }

    private static async Task<IResult> GetShotsAgainst(
        string abbrev,
        int season,
        bool? playoffs,
        int? period,
        string? shotType,
        bool? goalsOnly,
        string? scoreState,
        int? limit,
        ITeamRepository teamRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        // Validate shot type
        if (shotType != null && !ShotMappers.ValidShotTypes.Contains(shotType.ToUpperInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidShotType(ShotMappers.ValidShotTypes));
        }

        // Validate score state
        if (scoreState != null && !ShotMappers.ValidScoreStates.Contains(scoreState.ToLowerInvariant()))
        {
            return Results.BadRequest(new ApiError("InvalidScoreState", $"Invalid score state. Valid values: {string.Join(", ", ShotMappers.ValidScoreStates)}"));
        }

        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var shots = await shotRepository.GetAgainstTeamAsync(
            abbrev,
            season,
            playoffs,
            period,
            shotType?.ToUpperInvariant(),
            scoreState,
            limit,
            cancellationToken);

        // Filter goals only if requested
        var filteredShots = goalsOnly == true
            ? shots.Where(s => s.IsGoal).ToList()
            : shots.ToList();

        var shotDtos = ShotMappers.MapToDto(filteredShots);
        var summary = ShotMappers.CalculateSummary(filteredShots);

        return Results.Ok(new TeamShotsResponseDto(abbrev, season, playoffs, shotDtos, summary));
    }
}
