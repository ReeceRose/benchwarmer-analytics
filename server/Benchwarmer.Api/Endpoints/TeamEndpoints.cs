using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Api.Endpoints;

public static class TeamEndpoints
{
    public static void MapTeamEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/teams")
            .WithTags("Teams");

        group.MapGet("/", GetAllTeams)
            .WithName("GetAllTeams")
            .WithSummary("Get all NHL teams")
            .WithDescription("Returns a list of all 32 NHL teams with their division and conference information.")
            .Produces<TeamListDto>()
            .CacheOutput(CachePolicies.StaticData);

        group.MapGet("/{abbrev}", GetTeamByAbbrev)
            .WithName("GetTeamByAbbrev")
            .WithSummary("Get a team by abbreviation")
            .WithDescription("Returns details for a specific team. Use standard 3-letter NHL abbreviations (e.g., EDM, TOR, NYR).")
            .Produces<TeamDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.StaticData);

        group.MapGet("/{abbrev}/roster", GetTeamRoster)
            .WithName("GetTeamRoster")
            .WithSummary("Get roster for a team")
            .WithDescription("""
                Returns players on a team's roster with biographical details including position, height, weight, and headshot URL.

                **Query Parameters:**
                - `season`: Filter by season year (e.g., 2024 for 2024-25 season). If not provided, returns all players who have ever played for the team.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. If not provided, returns both.
                """)
            .Produces<RosterDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/lines", GetTeamLines)
            .WithName("GetTeamLines")
            .WithSummary("Get line combinations for a team")
            .WithDescription("""
                Returns line combinations (forward lines and defensive pairings) for a team with advanced statistics.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season)
                - `situation`: Game situation filter (5on5, 5on4, 4on5, all, etc.)
                - `lineType`: forward or defense
                - `minToi`: Minimum time on ice in minutes (filters out low-sample combinations)
                - `sortBy`: Sort field (toi, gf, ga, xgf, xgpct, cf, cfpct)
                - `sortDir`: asc or desc
                - `page`/`pageSize`: Pagination (both required together)
                """)
            .Produces<LineListDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/chemistry-matrix", GetChemistryMatrix)
            .WithName("GetChemistryMatrix")
            .WithSummary("Get player pair chemistry matrix for a team")
            .WithDescription("""
                Returns aggregated statistics for all player pairs on a team. Useful for building chemistry heat map visualizations.

                Each pair shows combined ice time, goals for/against, and expected goals percentage when those two players are on the ice together.
                """)
            .Produces<ChemistryMatrixDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/seasons", GetTeamSeasons)
            .WithName("GetTeamSeasons")
            .WithSummary("Get seasons with data for a team")
            .WithDescription("Returns all seasons that have player data for this specific team, sorted by most recent first.")
            .Produces<SeasonListDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/special-teams", GetSpecialTeams)
            .WithName("GetTeamSpecialTeams")
            .WithSummary("Get special teams stats for a team")
            .WithDescription("""
                Returns power play and penalty kill statistics for a team including league rankings.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. Defaults to false.
                """)
            .Produces<SpecialTeamsOverviewDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/special-teams/players", GetSpecialTeamsPlayers)
            .WithName("GetTeamSpecialTeamsPlayers")
            .WithSummary("Get player stats for special teams situations")
            .WithDescription("""
                Returns player stats for power play (5on4) or penalty kill (4on5) situations.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `situation`: 5on4 (power play) or 4on5 (penalty kill). Defaults to 5on4.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. Defaults to false.
                """)
            .Produces<SpecialTeamsPlayersDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/special-teams/trend", GetSpecialTeamsTrend)
            .WithName("GetTeamSpecialTeamsTrend")
            .WithSummary("Get game-by-game special teams trend data")
            .WithDescription("""
                Returns game-by-game special teams statistics for trend visualization.
                Calculates PP and PK performance from shot data grouped by game.

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. Defaults to false.
                """)
            .Produces<SpecialTeamsTrendDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/{abbrev}/score-state-stats", GetScoreStateStats)
            .WithName("GetTeamScoreStateStats")
            .WithSummary("Get score state statistics for a team")
            .WithDescription("""
                Returns offensive and defensive statistics broken down by game state (leading, trailing, tied).

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `playoffs`: Filter by season type. true = playoffs only, false = regular season only. Defaults to false.
                """)
            .Produces<ScoreStateStatsDto>()
            .Produces(StatusCodes.Status404NotFound)
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetAllTeams(
        ITeamRepository repository,
        CancellationToken cancellationToken)
    {
        var teams = await repository.GetAllAsync(cancellationToken);
        var dtos = teams.Select(t => new TeamDto(t.Id, t.Abbreviation, t.Name, t.Division, t.Conference, t.IsActive)).ToList();
        return Results.Ok(new TeamListDto(dtos));
    }

    private static async Task<IResult> GetTeamByAbbrev(
        string abbrev,
        ITeamRepository repository,
        CancellationToken cancellationToken)
    {
        var team = await repository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }
        return Results.Ok(new TeamDto(team.Id, team.Abbreviation, team.Name, team.Division, team.Conference, team.IsActive));
    }

    private static async Task<IResult> GetTeamRoster(
        string abbrev,
        int? season,
        bool? playoffs,
        ITeamRepository teamRepository,
        IPlayerRepository playerRepository,
        ISkaterStatsRepository skaterStatsRepository,
        IGoalieStatsRepository goalieStatsRepository,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        List<RosterPlayerDto> dtos = [];

        if (season.HasValue)
        {
            // Get skater and goalie stats in parallel
            var skaterStatsTask = skaterStatsRepository.GetByTeamSeasonAsync(abbrev, season.Value, "all", playoffs, cancellationToken);
            var goalieStatsTask = goalieStatsRepository.GetByTeamSeasonAsync(abbrev, season.Value, "all", playoffs, cancellationToken);

            await Task.WhenAll(skaterStatsTask, goalieStatsTask);

            var skaterStats = await skaterStatsTask;
            var goalieStats = await goalieStatsTask;

            // When playoffs is null (Both), we need to aggregate regular season + playoff stats per player
            if (!playoffs.HasValue)
            {
                // Aggregate skater stats
                var skaterDtos = skaterStats
                    .Where(s => s.Player != null)
                    .GroupBy(s => s.PlayerId)
                    .Select(g =>
                    {
                        var player = g.First().Player!;
                        var totalToi = g.Sum(s => s.IceTimeSeconds);
                        decimal? weightedCfPct = totalToi > 0
                            ? g.Sum(s => (s.CorsiForPct ?? 0m) * s.IceTimeSeconds) / totalToi
                            : null;

                        return new RosterPlayerDto(
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
                            player.Shoots,
                            g.Sum(s => s.GamesPlayed),
                            totalToi,
                            g.Sum(s => s.Goals),
                            g.Sum(s => s.Assists),
                            g.Sum(s => s.Goals) + g.Sum(s => s.Assists),
                            g.Sum(s => s.Shots),
                            g.Sum(s => s.ExpectedGoals),
                            weightedCfPct
                        );
                    });
                dtos.AddRange(skaterDtos);

                // Aggregate goalie stats
                var goalieDtos = goalieStats
                    .Where(g => g.Player != null)
                    .GroupBy(g => g.PlayerId)
                    .Select(g =>
                    {
                        var player = g.First().Player!;
                        var totalToi = g.Sum(s => s.IceTimeSeconds);
                        var totalShotsAgainst = g.Sum(s => s.ShotsAgainst);
                        var totalGoalsAgainst = g.Sum(s => s.GoalsAgainst);

                        // Recalculate aggregate stats
                        decimal? savePct = totalShotsAgainst > 0
                            ? (decimal)(totalShotsAgainst - totalGoalsAgainst) / totalShotsAgainst
                            : null;
                        decimal? gaa = totalToi > 0
                            ? (decimal)totalGoalsAgainst / ((decimal)totalToi / 3600m)
                            : null;
                        decimal? gsax = g.Sum(s => s.GoalsSavedAboveExpected);

                        return new RosterPlayerDto(
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
                            player.Shoots,
                            g.Sum(s => s.GamesPlayed),
                            totalToi,
                            GoalsAgainst: totalGoalsAgainst,
                            ShotsAgainst: totalShotsAgainst,
                            SavePercentage: savePct,
                            GoalsAgainstAverage: gaa,
                            GoalsSavedAboveExpected: gsax
                        );
                    });
                dtos.AddRange(goalieDtos);
            }
            else
            {
                // Skater stats for specific season type
                var skaterDtos = skaterStats
                    .Where(s => s.Player != null)
                    .Select(s => new RosterPlayerDto(
                        s.Player!.Id,
                        s.Player.Name,
                        s.Player.FirstName,
                        s.Player.LastName,
                        s.Player.Position,
                        s.Player.CurrentTeamAbbreviation,
                        PlayerHelpers.GetHeadshotUrl(s.Player.Id, s.Player.HeadshotUrl, s.Player.CurrentTeamAbbreviation),
                        s.Player.BirthDate,
                        s.Player.HeightInches,
                        s.Player.WeightLbs,
                        s.Player.Shoots,
                        s.GamesPlayed,
                        s.IceTimeSeconds,
                        s.Goals,
                        s.Assists,
                        s.Goals + s.Assists,
                        s.Shots,
                        s.ExpectedGoals,
                        s.CorsiForPct
                    ));
                dtos.AddRange(skaterDtos);

                // Goalie stats for specific season type
                var goalieDtos = goalieStats
                    .Where(g => g.Player != null)
                    .Select(g => new RosterPlayerDto(
                        g.Player!.Id,
                        g.Player.Name,
                        g.Player.FirstName,
                        g.Player.LastName,
                        g.Player.Position,
                        g.Player.CurrentTeamAbbreviation,
                        PlayerHelpers.GetHeadshotUrl(g.Player.Id, g.Player.HeadshotUrl, g.Player.CurrentTeamAbbreviation),
                        g.Player.BirthDate,
                        g.Player.HeightInches,
                        g.Player.WeightLbs,
                        g.Player.Shoots,
                        g.GamesPlayed,
                        g.IceTimeSeconds,
                        GoalsAgainst: g.GoalsAgainst,
                        ShotsAgainst: g.ShotsAgainst,
                        SavePercentage: g.SavePercentage,
                        GoalsAgainstAverage: g.GoalsAgainstAverage,
                        GoalsSavedAboveExpected: g.GoalsSavedAboveExpected
                    ));
                dtos.AddRange(goalieDtos);
            }

            // Sort by ice time
            dtos = [.. dtos.OrderByDescending(p => p.IceTimeSeconds)];
        }
        else
        {
            // Without season, just get player list without stats
            var players = await playerRepository.GetByTeamAsync(abbrev, cancellationToken);
            dtos = players.Select(p => new RosterPlayerDto(
                p.Id,
                p.Name,
                p.FirstName,
                p.LastName,
                p.Position,
                p.CurrentTeamAbbreviation,
                PlayerHelpers.GetHeadshotUrl(p.Id, p.HeadshotUrl, p.CurrentTeamAbbreviation),
                p.BirthDate,
                p.HeightInches,
                p.WeightLbs,
                p.Shoots
            )).ToList();
        }

        return Results.Ok(new RosterDto(abbrev, dtos, season, playoffs));
    }

    private static readonly string[] ValidSituations = ["all", "5on5", "5on4", "4on5", "5on3", "3on5", "4on4", "3on3", "other"];
    private static readonly string[] ValidLineTypes = ["forward", "defense"];
    private static readonly string[] ValidSortFields = ["toi", "icetime", "gp", "gamesplayed", "gf", "goalsfor", "ga", "goalsagainst", "xgf", "xgoalsfor", "xgpct", "xgoalspct", "cf", "corsifor", "cfpct", "corsipct"];

    private static async Task<IResult> GetTeamLines(
        string abbrev,
        int season,
        string? situation,
        string? lineType,
        int? minToi,
        string? sortBy,
        string? sortDir,
        int? page,
        int? pageSize,
        ITeamRepository teamRepository,
        ILineRepository lineRepository,
        CancellationToken cancellationToken)
    {
        // Validate situation
        if (situation != null && !ValidSituations.Contains(situation.ToLowerInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidSituation(ValidSituations));
        }

        // Validate lineType
        if (lineType != null && !ValidLineTypes.Contains(lineType.ToLowerInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidLineType(ValidLineTypes));
        }

        // Validate sortBy
        if (sortBy != null && !ValidSortFields.Contains(sortBy.ToLowerInvariant()))
        {
            return Results.BadRequest(ApiError.InvalidSortField(ValidSortFields));
        }

        // Validate sortDir
        var sortDescending = true;
        if (sortDir != null)
        {
            if (sortDir.ToLowerInvariant() is not ("asc" or "desc"))
            {
                return Results.BadRequest(ApiError.InvalidSortDir);
            }
            sortDescending = sortDir.ToLowerInvariant() == "desc";
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

        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var minToiSeconds = (minToi ?? 0) * 60;
        var (lines, totalCount) = await lineRepository.GetByTeamAsync(
            abbrev, season, situation, lineType, minToiSeconds, sortBy, sortDescending, page, pageSize, cancellationToken);

        var dtos = lines.Select(l => new LineCombinationDto(
            l.Id,
            l.Season,
            l.Team,
            l.Situation,
            new PlayerSummaryDto(l.Player1Id, l.Player1?.Name ?? "Unknown", l.Player1?.Position),
            new PlayerSummaryDto(l.Player2Id, l.Player2?.Name ?? "Unknown", l.Player2?.Position),
            l.Player3Id.HasValue
                ? new PlayerSummaryDto(l.Player3Id.Value, l.Player3?.Name ?? "Unknown", l.Player3?.Position)
                : null,
            l.IceTimeSeconds,
            l.GamesPlayed,
            l.GoalsFor,
            l.GoalsAgainst,
            l.ExpectedGoalsPct,
            l.CorsiPct
        )).ToList();

        int? totalPages = page.HasValue && pageSize.HasValue
            ? (int)Math.Ceiling((double)totalCount / pageSize.Value)
            : null;

        return Results.Ok(new LineListDto(dtos, totalCount, page, pageSize, totalPages));
    }

    private static async Task<IResult> GetChemistryMatrix(
        string abbrev,
        int season,
        string? situation,
        string? position,
        ITeamRepository teamRepository,
        ILineRepository lineRepository,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var pairs = await lineRepository.GetChemistryMatrixAsync(abbrev, season, situation, position, cancellationToken);

        var dtos = pairs.Select(p => new ChemistryPairDto(
            p.Player1Id,
            p.Player1Name,
            p.Player1Position,
            p.Player2Id,
            p.Player2Name,
            p.Player2Position,
            p.TotalIceTimeSeconds,
            p.GamesPlayed,
            p.GoalsFor,
            p.GoalsAgainst,
            p.ExpectedGoalsPct,
            p.CorsiPct
        )).ToList();

        return Results.Ok(new ChemistryMatrixDto(abbrev, season, situation, dtos));
    }

    private static async Task<IResult> GetTeamSeasons(
        string abbrev,
        ITeamRepository teamRepository,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var seasons = await db.SkaterSeasons
            .Where(s => s.Team == abbrev)
            .Select(s => s.Season)
            .Distinct()
            .OrderByDescending(s => s)
            .ToListAsync(cancellationToken);

        var dtos = seasons.Select(year => new SeasonDto(
            year,
            $"{year}-{(year + 1) % 100:D2}"
        )).ToList();

        return Results.Ok(new SeasonListDto(dtos));
    }

    private static readonly string[] ValidSpecialTeamsSituations = ["5on4", "4on5"];

    private static async Task<IResult> GetSpecialTeams(
        string abbrev,
        int? season,
        bool? playoffs,
        ITeamRepository teamRepository,
        ITeamSeasonRepository teamSeasonRepository,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var seasonYear = season ?? DateTime.Now.Year;
        var isPlayoffs = playoffs ?? false;

        // Run all queries in parallel
        var ppStatsTask = teamSeasonRepository.GetByTeamSeasonAsync(abbrev, seasonYear, "5on4", isPlayoffs, cancellationToken);
        var pkStatsTask = teamSeasonRepository.GetByTeamSeasonAsync(abbrev, seasonYear, "4on5", isPlayoffs, cancellationToken);
        var allPpStatsTask = teamSeasonRepository.GetBySeasonAsync(seasonYear, "5on4", isPlayoffs, cancellationToken);
        var allPkStatsTask = teamSeasonRepository.GetBySeasonAsync(seasonYear, "4on5", isPlayoffs, cancellationToken);

        await Task.WhenAll(ppStatsTask, pkStatsTask, allPpStatsTask, allPkStatsTask);

        var ppStats = await ppStatsTask;
        var pkStats = await pkStatsTask;
        var allPpStats = await allPpStatsTask;
        var allPkStats = await allPkStatsTask;

        // Calculate PP rankings (higher PP% is better)
        var ppRankings = allPpStats
            .Select(t => new { t.TeamAbbreviation, PPPct = TeamMappers.CalculatePPPercentage(t) })
            .OrderByDescending(t => t.PPPct)
            .Select((t, i) => new { t.TeamAbbreviation, Rank = i + 1 })
            .ToDictionary(t => t.TeamAbbreviation, t => t.Rank);

        // Calculate PK rankings (higher PK% is better)
        var pkRankings = allPkStats
            .Select(t => new { t.TeamAbbreviation, PKPct = TeamMappers.CalculatePKPercentage(t) })
            .OrderByDescending(t => t.PKPct)
            .Select((t, i) => new { t.TeamAbbreviation, Rank = i + 1 })
            .ToDictionary(t => t.TeamAbbreviation, t => t.Rank);

        var ppSummary = TeamMappers.CreatePowerPlaySummary(ppStats, ppRankings.GetValueOrDefault(abbrev));
        var pkSummary = TeamMappers.CreatePenaltyKillSummary(pkStats, pkRankings.GetValueOrDefault(abbrev));

        return Results.Ok(new SpecialTeamsOverviewDto(abbrev, seasonYear, ppSummary, pkSummary));
    }

    private static async Task<IResult> GetSpecialTeamsPlayers(
        string abbrev,
        int? season,
        string? situation,
        bool? playoffs,
        ITeamRepository teamRepository,
        ISkaterStatsRepository skaterStatsRepository,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var sit = situation?.ToLowerInvariant() ?? "5on4";
        if (!ValidSpecialTeamsSituations.Contains(sit))
        {
            return Results.BadRequest(ApiError.InvalidSituation(ValidSpecialTeamsSituations));
        }

        var seasonYear = season ?? DateTime.Now.Year;
        var isPlayoffs = playoffs ?? false;

        var stats = await skaterStatsRepository.GetByTeamSeasonAsync(abbrev, seasonYear, sit, isPlayoffs, cancellationToken);

        var players = stats
            .Where(s => s.Player != null && s.IceTimeSeconds > 0)
            .OrderByDescending(s => s.IceTimeSeconds)
            .Select(s =>
            {
                var iceTimeMinutes = s.IceTimeSeconds / 60m;
                var points = s.Goals + s.Assists;
                decimal? pointsPer60 = iceTimeMinutes > 0 ? points / iceTimeMinutes * 60 : null;

                return new SpecialTeamsPlayerDto(
                    s.PlayerId,
                    s.Player!.Name,
                    s.Player.Position,
                    s.IceTimeSeconds,
                    s.Goals,
                    s.Assists,
                    points,
                    s.Shots,
                    s.ExpectedGoals,
                    s.ExpectedGoalsPer60,
                    pointsPer60,
                    s.GamesPlayed
                );
            })
            .ToList();

        return Results.Ok(new SpecialTeamsPlayersDto(abbrev, seasonYear, sit, players));
    }

    private static async Task<IResult> GetSpecialTeamsTrend(
        string abbrev,
        int? season,
        bool? playoffs,
        ITeamRepository teamRepository,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var seasonYear = season ?? DateTime.Now.Year;
        var isPlayoffs = playoffs ?? false;

        // Get all games for this team in the season
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var games = await db.Games
            .Where(g => g.Season == seasonYear
                        && (isPlayoffs ? g.GameType == GameState.Playoffs : g.GameType == GameState.RegularSeason)
                        && (g.HomeTeamCode == abbrev || g.AwayTeamCode == abbrev)
                        && (g.GameState == GameState.Final || (g.GameDate < today && (g.HomeScore > 0 || g.AwayScore > 0))))
            .OrderBy(g => g.GameDate)
            .ToListAsync(cancellationToken);

        if (games.Count == 0)
        {
            return Results.Ok(new SpecialTeamsTrendDto(abbrev, seasonYear, []));
        }

        var gameIds = games.Select(g => g.GameId).ToList();

        // Get all shots from these games
        var shots = await db.Shots
            .Where(s => gameIds.Contains(s.GameId))
            .Select(s => new
            {
                s.GameId,
                s.TeamCode,
                s.HomeTeamCode,
                s.AwayTeamCode,
                s.IsHomeTeam,
                s.HomeSkatersOnIce,
                s.AwaySkatersOnIce,
                s.IsGoal,
                s.XGoal
            })
            .ToListAsync(cancellationToken);

        // Group shots by game and calculate PP/PK stats
        var shotsByGame = shots.GroupBy(s => s.GameId).ToDictionary(g => g.Key, g => g.ToList());

        var gameDtos = new List<SpecialTeamsGameDto>();
        int cumulativePpGoals = 0;
        decimal cumulativePpXGoals = 0;
        int cumulativePkGoalsAgainst = 0;
        decimal cumulativePkXGoalsAgainst = 0;

        foreach (var game in games)
        {
            var isHome = game.HomeTeamCode == abbrev;
            var opponent = isHome ? game.AwayTeamCode : game.HomeTeamCode;

            if (!shotsByGame.TryGetValue(game.GameId, out var gameShots))
            {
                // No shot data for this game, add zero entry
                gameDtos.Add(new SpecialTeamsGameDto(
                    game.GameId,
                    game.GameDate,
                    opponent,
                    isHome,
                    0, 0, 0, 0, 0, 0,
                    cumulativePpGoals, cumulativePpXGoals,
                    cumulativePkGoalsAgainst, cumulativePkXGoalsAgainst
                ));
                continue;
            }

            // Power play shots (team has 5 skaters, opponent has 4)
            // For home team: HomeSkatersOnIce = 5, AwaySkatersOnIce = 4
            // For away team: AwaySkatersOnIce = 5, HomeSkatersOnIce = 4
            var ppShots = gameShots.Where(s =>
                s.TeamCode == abbrev &&
                (isHome
                    ? (s.HomeSkatersOnIce == 5 && s.AwaySkatersOnIce == 4)
                    : (s.AwaySkatersOnIce == 5 && s.HomeSkatersOnIce == 4))
            ).ToList();

            // Penalty kill shots against (opponent shooting when team has 4, opponent has 5)
            var pkShots = gameShots.Where(s =>
                s.TeamCode != abbrev &&
                (s.HomeTeamCode == abbrev || s.AwayTeamCode == abbrev) &&
                (isHome
                    ? (s.HomeSkatersOnIce == 4 && s.AwaySkatersOnIce == 5)
                    : (s.AwaySkatersOnIce == 4 && s.HomeSkatersOnIce == 5))
            ).ToList();

            var ppGoals = ppShots.Count(s => s.IsGoal);
            var ppXGoals = ppShots.Sum(s => s.XGoal ?? 0);
            var ppShotCount = ppShots.Count;

            var pkGoalsAgainst = pkShots.Count(s => s.IsGoal);
            var pkXGoalsAgainst = pkShots.Sum(s => s.XGoal ?? 0);
            var pkShotCount = pkShots.Count;

            cumulativePpGoals += ppGoals;
            cumulativePpXGoals += ppXGoals;
            cumulativePkGoalsAgainst += pkGoalsAgainst;
            cumulativePkXGoalsAgainst += pkXGoalsAgainst;

            gameDtos.Add(new SpecialTeamsGameDto(
                game.GameId,
                game.GameDate,
                opponent,
                isHome,
                ppGoals,
                Math.Round(ppXGoals, 2),
                ppShotCount,
                pkGoalsAgainst,
                Math.Round(pkXGoalsAgainst, 2),
                pkShotCount,
                cumulativePpGoals,
                Math.Round(cumulativePpXGoals, 2),
                cumulativePkGoalsAgainst,
                Math.Round(cumulativePkXGoalsAgainst, 2)
            ));
        }

        return Results.Ok(new SpecialTeamsTrendDto(abbrev, seasonYear, gameDtos));
    }

    private static async Task<IResult> GetScoreStateStats(
        string abbrev,
        int? season,
        bool? playoffs,
        ITeamRepository teamRepository,
        IDbContextFactory<AppDbContext> dbFactory,
        CancellationToken cancellationToken)
    {
        // Input validation
        if (string.IsNullOrWhiteSpace(abbrev) || abbrev.Length > 3)
        {
            return Results.BadRequest("Invalid team abbreviation");
        }

        var team = await teamRepository.GetByAbbrevAsync(abbrev, cancellationToken);
        if (team is null)
        {
            return Results.NotFound(ApiError.TeamNotFound);
        }

        var seasonYear = season ?? DateTime.Now.Year;
        var isPlayoffs = playoffs ?? false;

        // Run aggregated shots query and time query in parallel (no Task.Run needed for async operations)
        async Task<List<ShotAggregation>> GetShotAggregationsAsync()
        {
            await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

            // Aggregate shots in SQL, grouping by whether it's for/against the team and score state
            // This returns at most 6 rows (3 states × 2 directions) instead of thousands of shot records
            return await db.Shots
                .Where(s => s.Season == seasonYear
                            && s.IsPlayoffGame == isPlayoffs
                            && (s.TeamCode == abbrev || s.HomeTeamCode == abbrev || s.AwayTeamCode == abbrev))
                .GroupBy(s => new
                {
                    IsFor = s.TeamCode == abbrev,
                    // Determine score state from team's perspective (not shooting team's perspective)
                    // When team is home: leading = HomeGoals > AwayGoals
                    // When team is away: leading = AwayGoals > HomeGoals
                    State = s.HomeTeamGoals == s.AwayTeamGoals ? "tied" :
                        // For shots BY our team
                        (s.TeamCode == abbrev
                            ? (s.IsHomeTeam
                                ? (s.HomeTeamGoals > s.AwayTeamGoals ? "leading" : "trailing")
                                : (s.AwayTeamGoals > s.HomeTeamGoals ? "leading" : "trailing"))
                            // For shots AGAINST our team (opponent shooting)
                            : (s.HomeTeamCode == abbrev
                                ? (s.HomeTeamGoals > s.AwayTeamGoals ? "leading" : "trailing")
                                : (s.AwayTeamGoals > s.HomeTeamGoals ? "leading" : "trailing")))
                })
                .Select(g => new ShotAggregation(
                    g.Key.IsFor,
                    g.Key.State,
                    g.Count(),
                    g.Count(x => x.IsGoal),
                    g.Sum(x => x.XGoal ?? 0m)
                ))
                .ToListAsync(cancellationToken);
        }

        async Task<TimeAggregation?> GetTimeAggregationAsync()
        {
            await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
            return await db.GameScoreStateTimes
                .Where(t => t.TeamAbbreviation == abbrev && t.Season == seasonYear && t.IsPlayoffs == isPlayoffs)
                .GroupBy(_ => 1)
                .OrderBy(_ => 1) // Silence EF warning - only one group exists
                .Select(g => new TimeAggregation(
                    g.Sum(t => t.LeadingSeconds),
                    g.Sum(t => t.TrailingSeconds),
                    g.Sum(t => t.TiedSeconds)
                ))
                .FirstOrDefaultAsync(cancellationToken);
        }

        var shotsTask = GetShotAggregationsAsync();
        var timeTask = GetTimeAggregationAsync();

        await Task.WhenAll(shotsTask, timeTask);

        var shotAggregations = await shotsTask;
        var timeData = await timeTask;

        // Build breakdowns from aggregated data
        var leading = CreateBreakdownFromAggregations("leading", shotAggregations, timeData?.LeadingSeconds);
        var trailing = CreateBreakdownFromAggregations("trailing", shotAggregations, timeData?.TrailingSeconds);
        var tied = CreateBreakdownFromAggregations("tied", shotAggregations, timeData?.TiedSeconds);

        var totalTime = (timeData?.LeadingSeconds ?? 0) + (timeData?.TrailingSeconds ?? 0) + (timeData?.TiedSeconds ?? 0);
        var total = CreateBreakdownFromAggregations(null, shotAggregations, totalTime > 0 ? totalTime : null);

        return Results.Ok(new ScoreStateStatsDto(
            abbrev,
            seasonYear,
            isPlayoffs,
            leading,
            trailing,
            tied,
            total
        ));
    }

    private record ShotAggregation(bool IsFor, string State, int ShotCount, int GoalCount, decimal XGoals);
    private record TimeAggregation(int LeadingSeconds, int TrailingSeconds, int TiedSeconds);

    private static ScoreStateBreakdown CreateBreakdownFromAggregations(
        string? stateFilter,
        List<ShotAggregation> aggregations,
        int? timeSeconds)
    {
        // Filter by state if specified, otherwise sum all (for total)
        var relevantAggs = stateFilter != null
            ? aggregations.Where(a => a.State == stateFilter).ToList()
            : aggregations;

        var forAgg = relevantAggs.Where(a => a.IsFor).ToList();
        var againstAgg = relevantAggs.Where(a => !a.IsFor).ToList();

        var sf = forAgg.Sum(a => a.ShotCount);
        var sa = againstAgg.Sum(a => a.ShotCount);
        var gf = forAgg.Sum(a => a.GoalCount);
        var ga = againstAgg.Sum(a => a.GoalCount);
        var xgf = forAgg.Sum(a => a.XGoals);
        var xga = againstAgg.Sum(a => a.XGoals);

        return new ScoreStateBreakdown(
            stateFilter ?? "total",
            sf,
            sa,
            gf,
            ga,
            Math.Round(xgf, 2),
            Math.Round(xga, 2),
            sf > 0 ? Math.Round((decimal)gf / sf * 100, 1) : null,
            sa > 0 ? Math.Round((decimal)(sa - ga) / sa * 100, 1) : null,
            Math.Round(xgf - xga, 2),
            timeSeconds
        );
    }
}
