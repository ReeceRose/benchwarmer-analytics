using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Api.Endpoints;

public static class SpecialTeamsEndpoints
{
    public static void MapSpecialTeamsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/special-teams")
            .WithTags("Special Teams");

        group.MapGet("/team-rankings", GetTeamRankings)
            .WithName("GetSpecialTeamsTeamRankings")
            .WithSummary("Get league-wide special teams rankings")
            .WithDescription("""
                Returns all teams ranked by power play and penalty kill performance.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. Defaults to false.
                """)
            .Produces<TeamSpecialTeamsRankingsResponse>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/player-leaders", GetPlayerLeaders)
            .WithName("GetSpecialTeamsPlayerLeaders")
            .WithSummary("Get player leaderboards for special teams situations")
            .WithDescription("""
                Returns player leaderboards for power play (5on4) or penalty kill (4on5) situations.

                **Query Parameters:**
                - `situation`: 5on4 (power play) or 4on5 (penalty kill). Required.
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. Defaults to false.
                - `minToi`: Minimum ice time in minutes (default: 50).
                - `position`: Filter by position (F, D, or all).
                - `team`: Filter by team abbreviation.
                - `limit`: Maximum entries to return (default: 50, max: 100).
                - `sortBy`: Sort field (toi, goals, assists, points, pointsPer60, xgPer60). Default: points.
                - `sortDir`: Sort direction (asc or desc). Default: desc.
                """)
            .Produces<SpecialTeamsPlayerLeadersResponse>()
            .Produces(StatusCodes.Status400BadRequest)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/penalty-stats", GetPenaltyStats)
            .WithName("GetPenaltyStats")
            .WithSummary("Get player penalty drawing and taking statistics")
            .WithDescription("""
                Returns player penalty stats including penalties drawn, taken, and net differential.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. Defaults to false.
                - `minToi`: Minimum ice time in minutes (default: 100).
                - `position`: Filter by position (F, D, or all).
                - `team`: Filter by team abbreviation.
                - `limit`: Maximum entries to return (default: 50, max: 100).
                - `sortBy`: Sort field (penaltiesDrawn, penaltiesTaken, netPenalties, drawnPer60, takenPer60, netPer60). Default: netPenalties.
                - `sortDir`: Sort direction (asc or desc). Default: desc.
                """)
            .Produces<PlayerPenaltyStatsResponse>()
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetTeamRankings(
        int? season,
        bool? playoffs,
        ITeamRepository teamRepository,
        ITeamSeasonRepository teamSeasonRepository,
        CancellationToken cancellationToken)
    {
        var seasonYear = season ?? StatsMappers.GetDefaultSeason();
        var isPlayoffs = playoffs ?? false;

        // Get all teams and their PP/PK stats in parallel
        var teamsTask = teamRepository.GetAllAsync(cancellationToken);
        var ppStatsTask = teamSeasonRepository.GetBySeasonAsync(seasonYear, "5on4", isPlayoffs, cancellationToken);
        var pkStatsTask = teamSeasonRepository.GetBySeasonAsync(seasonYear, "4on5", isPlayoffs, cancellationToken);

        await Task.WhenAll(teamsTask, ppStatsTask, pkStatsTask);

        var teams = await teamsTask;
        var ppStats = (await ppStatsTask).ToDictionary(s => s.TeamAbbreviation);
        var pkStats = (await pkStatsTask).ToDictionary(s => s.TeamAbbreviation);

        // Calculate stats for all teams
        var teamStats = teams
            .Where(t => t.IsActive)
            .Select(t =>
            {
                var pp = ppStats.GetValueOrDefault(t.Abbreviation);
                var pk = pkStats.GetValueOrDefault(t.Abbreviation);

                var ppPct = TeamMappers.CalculatePPPercentage(pp);
                var pkPct = TeamMappers.CalculatePKPercentage(pk);

                return new
                {
                    Team = t,
                    PpStats = pp,
                    PkStats = pk,
                    PpPct = ppPct,
                    PkPct = pkPct,
                    CombinedPct = ppPct + pkPct
                };
            })
            .ToList();

        // Calculate rankings
        var ppRankings = teamStats
            .OrderByDescending(t => t.PpPct)
            .Select((t, i) => new { t.Team.Abbreviation, Rank = i + 1 })
            .ToDictionary(t => t.Abbreviation, t => t.Rank);

        var pkRankings = teamStats
            .OrderByDescending(t => t.PkPct)
            .Select((t, i) => new { t.Team.Abbreviation, Rank = i + 1 })
            .ToDictionary(t => t.Abbreviation, t => t.Rank);

        var overallRankings = teamStats
            .OrderByDescending(t => t.CombinedPct)
            .Select((t, i) => new { t.Team.Abbreviation, Rank = i + 1 })
            .ToDictionary(t => t.Abbreviation, t => t.Rank);

        // Build DTOs
        var rankings = teamStats
            .OrderByDescending(t => t.CombinedPct)
            .Select(t => SpecialTeamsStatsMappers.CreateTeamRanking(
                t.Team,
                t.PpStats,
                t.PkStats,
                ppRankings[t.Team.Abbreviation],
                pkRankings[t.Team.Abbreviation],
                overallRankings[t.Team.Abbreviation]))
            .ToList();

        return Results.Ok(new TeamSpecialTeamsRankingsResponse(seasonYear, rankings));
    }

    private static readonly string[] ValidSpecialTeamsSituations = ["5on4", "4on5"];
    private static readonly string[] ValidPositions = ["F", "D"];
    private static readonly string[] ValidPlayerLeaderSorts = ["toi", "goals", "assists", "points", "pointsper60", "xgper60"];

    private static async Task<IResult> GetPlayerLeaders(
        string? situation,
        int? season,
        bool? playoffs,
        int? minToi,
        string? position,
        string? team,
        int? limit,
        string? sortBy,
        string? sortDir,
        ISkaterStatsRepository skaterStatsRepository,
        CancellationToken cancellationToken)
    {
        var sit = situation?.ToLowerInvariant();
        if (string.IsNullOrEmpty(sit) || !ValidSpecialTeamsSituations.Contains(sit))
        {
            return Results.BadRequest(ApiError.InvalidSituation(ValidSpecialTeamsSituations));
        }

        if (position != null && !ValidPositions.Contains(position.ToUpperInvariant()))
        {
            return Results.BadRequest($"Invalid position. Valid positions: {string.Join(", ", ValidPositions)}");
        }

        var sort = sortBy?.ToLowerInvariant() ?? "points";
        if (!ValidPlayerLeaderSorts.Contains(sort))
        {
            return Results.BadRequest($"Invalid sortBy. Valid options: {string.Join(", ", ValidPlayerLeaderSorts)}");
        }

        var seasonYear = season ?? StatsMappers.GetDefaultSeason();
        var isPlayoffs = playoffs ?? false;
        var minToiSeconds = (minToi ?? 50) * 60;
        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);
        var ascending = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        var stats = await skaterStatsRepository.GetBySeasonSituationAsync(
            seasonYear, sit, isPlayoffs, cancellationToken);

        var filteredStats = stats
            .Where(s => s.Player != null && s.IceTimeSeconds >= minToiSeconds)
            .Where(s => position == null || s.Player!.Position?.StartsWith(position.ToUpperInvariant()) == true ||
                        (position.ToUpperInvariant() == "F" && (s.Player!.Position == "C" || s.Player!.Position == "LW" || s.Player!.Position == "RW")))
            .Where(s => team == null || s.Team.Equals(team, StringComparison.OrdinalIgnoreCase));

        // Sort
        filteredStats = sort switch
        {
            "toi" => ascending
                ? filteredStats.OrderBy(s => s.IceTimeSeconds)
                : filteredStats.OrderByDescending(s => s.IceTimeSeconds),
            "goals" => ascending
                ? filteredStats.OrderBy(s => s.Goals)
                : filteredStats.OrderByDescending(s => s.Goals),
            "assists" => ascending
                ? filteredStats.OrderBy(s => s.Assists)
                : filteredStats.OrderByDescending(s => s.Assists),
            "pointsper60" => ascending
                ? filteredStats.OrderBy(s => s.IceTimeSeconds > 0 ? (s.Goals + s.Assists) / (s.IceTimeSeconds / 3600m) : 0)
                : filteredStats.OrderByDescending(s => s.IceTimeSeconds > 0 ? (s.Goals + s.Assists) / (s.IceTimeSeconds / 3600m) : 0),
            "xgper60" => ascending
                ? filteredStats.OrderBy(s => s.ExpectedGoalsPer60 ?? 0)
                : filteredStats.OrderByDescending(s => s.ExpectedGoalsPer60 ?? 0),
            _ => ascending // "points" default
                ? filteredStats.OrderBy(s => s.Goals + s.Assists)
                : filteredStats.OrderByDescending(s => s.Goals + s.Assists)
        };

        var leaders = filteredStats
            .Take(effectiveLimit)
            .Select(s => SpecialTeamsStatsMappers.CreatePlayerLeader(s))
            .ToList();

        return Results.Ok(new SpecialTeamsPlayerLeadersResponse(seasonYear, sit, leaders));
    }

    private static readonly string[] ValidPenaltySorts = ["penaltiesdrawn", "penaltiestaken", "netpenalties", "drawnper60", "takenper60", "netper60"];

    private static async Task<IResult> GetPenaltyStats(
        int? season,
        bool? playoffs,
        int? minToi,
        string? position,
        string? team,
        int? limit,
        string? sortBy,
        string? sortDir,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        if (position != null && !ValidPositions.Contains(position.ToUpperInvariant()))
        {
            return Results.BadRequest($"Invalid position. Valid positions: {string.Join(", ", ValidPositions)}");
        }

        var sort = sortBy?.ToLowerInvariant() ?? "netpenalties";
        if (!ValidPenaltySorts.Contains(sort))
        {
            return Results.BadRequest($"Invalid sortBy. Valid options: {string.Join(", ", ValidPenaltySorts)}");
        }

        var seasonYear = season ?? StatsMappers.GetDefaultSeason();
        var isPlayoffs = playoffs ?? false;
        var minToiMinutes = minToi ?? 100;
        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);
        var ascending = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        // Query SkaterSeasonAdvanced for penalty data, join with SkaterSeason for ice time and GP
        // We use "all" situation for penalty stats since penalties happen across all situations
        var query = from adv in db.SkaterSeasonAdvanced
                    join ss in db.SkaterSeasons on new { adv.PlayerId, adv.Season, adv.Team, adv.IsPlayoffs }
                        equals new { ss.PlayerId, ss.Season, ss.Team, ss.IsPlayoffs }
                    join p in db.Players on adv.PlayerId equals p.Id
                    where adv.Season == seasonYear
                          && adv.IsPlayoffs == isPlayoffs
                          && adv.Situation == "all"
                          && ss.Situation == "all"
                          && ss.IceTimeSeconds > 0
                    select new
                    {
                        adv.PlayerId,
                        p.Name,
                        adv.Team,
                        p.Position,
                        ss.GamesPlayed,
                        ss.IceTimeSeconds,
                        PenaltiesDrawn = adv.PenaltiesDrawn ?? 0,
                        PenaltiesTaken = adv.Penalties ?? 0,
                        PimDrawn = adv.PenalityMinutesDrawn ?? 0,
                        PimTaken = adv.PenalityMinutes ?? 0
                    };

        var results = await query.ToListAsync(cancellationToken);

        // Apply filters in memory
        var filtered = results
            .Where(r => (r.IceTimeSeconds / 60m) >= minToiMinutes)
            .Where(r => position == null || r.Position?.StartsWith(position.ToUpperInvariant()) == true ||
                        (position.ToUpperInvariant() == "F" && (r.Position == "C" || r.Position == "LW" || r.Position == "RW")))
            .Where(r => team == null || r.Team.Equals(team, StringComparison.OrdinalIgnoreCase))
            .Select(r =>
            {
                var iceTimeMinutes = r.IceTimeSeconds / 60m;
                var drawn = (int)r.PenaltiesDrawn;
                var taken = (int)r.PenaltiesTaken;
                var net = drawn - taken;
                var drawnPer60 = iceTimeMinutes > 0 ? drawn / iceTimeMinutes * 60 : 0;
                var takenPer60 = iceTimeMinutes > 0 ? taken / iceTimeMinutes * 60 : 0;
                var netPer60 = iceTimeMinutes > 0 ? net / iceTimeMinutes * 60 : 0;

                return new PlayerPenaltyStatsDto(
                    r.PlayerId,
                    r.Name,
                    r.Team,
                    r.Position,
                    r.GamesPlayed,
                    Math.Round(iceTimeMinutes, 1),
                    drawn,
                    taken,
                    net,
                    Math.Round(drawnPer60, 2),
                    Math.Round(takenPer60, 2),
                    Math.Round(netPer60, 2),
                    Math.Round(r.PimDrawn, 0),
                    Math.Round(r.PimTaken, 0)
                );
            });

        // Sort
        filtered = sort switch
        {
            "penaltiesdrawn" => ascending
                ? filtered.OrderBy(s => s.PenaltiesDrawn)
                : filtered.OrderByDescending(s => s.PenaltiesDrawn),
            "penaltiestaken" => ascending
                ? filtered.OrderBy(s => s.PenaltiesTaken)
                : filtered.OrderByDescending(s => s.PenaltiesTaken),
            "drawnper60" => ascending
                ? filtered.OrderBy(s => s.PenaltiesDrawnPer60)
                : filtered.OrderByDescending(s => s.PenaltiesDrawnPer60),
            "takenper60" => ascending
                ? filtered.OrderBy(s => s.PenaltiesTakenPer60)
                : filtered.OrderByDescending(s => s.PenaltiesTakenPer60),
            "netper60" => ascending
                ? filtered.OrderBy(s => s.NetPenaltiesPer60)
                : filtered.OrderByDescending(s => s.NetPenaltiesPer60),
            _ => ascending // "netpenalties" default
                ? filtered.OrderBy(s => s.NetPenalties)
                : filtered.OrderByDescending(s => s.NetPenalties)
        };

        var players = filtered.Take(effectiveLimit).ToList();

        return Results.Ok(new PlayerPenaltyStatsResponse(seasonYear, players));
    }
}
