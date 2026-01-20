using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Repositories;

namespace Benchwarmer.Api.Endpoints;

public static class ShotEndpoints
{
    private static readonly string[] ValidShotTypes = ["WRIST", "SLAP", "SNAP", "BACKHAND", "TIP", "WRAP", "DEFLECTED"];

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
    }

    private static async Task<IResult> GetTeamShots(
        string abbrev,
        int season,
        bool? playoffs,
        int? period,
        string? shotType,
        int? playerId,
        bool? goalsOnly,
        int? limit,
        ITeamRepository teamRepository,
        IShotRepository shotRepository,
        CancellationToken cancellationToken)
    {
        // Validate shot type
        if (shotType != null && !ValidShotTypes.Contains(shotType.ToUpperInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidShotType(ValidShotTypes));
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
            effectiveLimit,
            cancellationToken);

        // Filter goals only if requested (done in memory since repo doesn't support this filter)
        var filteredShots = goalsOnly == true
            ? shots.Where(s => s.IsGoal).ToList()
            : shots;

        var shotDtos = filteredShots.Select(s => new ShotDto(
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
        var totalShots = filteredShots.Count;
        var goals = filteredShots.Count(s => s.IsGoal);
        var shotsOnGoal = filteredShots.Count(s => s.ShotWasOnGoal);
        var shootingPct = totalShots > 0 ? Math.Round((decimal)goals / totalShots * 100, 1) : 0;
        var totalXGoal = filteredShots.Sum(s => s.XGoal ?? 0);
        var goalsAboveExpected = Math.Round(goals - totalXGoal, 2);

        // Danger classification based on xG thresholds
        var highDanger = filteredShots.Count(s => s.XGoal > 0.15m);
        var mediumDanger = filteredShots.Count(s => s.XGoal >= 0.06m && s.XGoal <= 0.15m);
        var lowDanger = filteredShots.Count(s => s.XGoal < 0.06m);

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
            null, // no limit for aggregation
            cancellationToken);

        // Group by shooter and calculate stats
        var shooterStats = shots
            .Where(s => s.ShooterPlayerId.HasValue)
            .GroupBy(s => new { s.ShooterPlayerId, s.ShooterName, s.ShooterPosition })
            .Select(g =>
            {
                var shotCount = g.Count();
                var goalCount = g.Count(s => s.IsGoal);
                var totalXGoal = g.Sum(s => s.XGoal ?? 0);

                return new ShooterStatsDto(
                    g.Key.ShooterPlayerId!.Value,
                    g.Key.ShooterName ?? "Unknown",
                    g.Key.ShooterPosition,
                    shotCount,
                    goalCount,
                    shotCount > 0 ? Math.Round((decimal)goalCount / shotCount * 100, 1) : 0,
                    Math.Round(totalXGoal, 2),
                    Math.Round(goalCount - totalXGoal, 2)
                );
            })
            .OrderByDescending(s => s.Shots)
            .ToList();

        return Results.Ok(shooterStats);
    }
}
