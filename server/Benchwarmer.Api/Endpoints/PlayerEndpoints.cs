using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Repositories;

namespace Benchwarmer.Api.Endpoints;

public static class PlayerEndpoints
{
    public static void MapPlayerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/players")
            .WithTags("Players");

        group.MapGet("/", SearchPlayers)
            .WithName("SearchPlayers")
            .WithSummary("Search for players by name");

        group.MapGet("/compare", ComparePlayers)
            .WithName("ComparePlayers")
            .WithSummary("Compare multiple players' stats");

        group.MapGet("/{id:int}", GetPlayerById)
            .WithName("GetPlayerById")
            .WithSummary("Get a player by ID");

        group.MapGet("/{id:int}/stats", GetPlayerStats)
            .WithName("GetPlayerStats")
            .WithSummary("Get statistics for a player");

        group.MapGet("/{id:int}/linemates", GetPlayerLinemates)
            .WithName("GetPlayerLinemates")
            .WithSummary("Get linemate history for a player");
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

        // Get all line combinations involving this player
        // We need to search across all teams the player has played for
        // For now, use current team if available
        if (string.IsNullOrEmpty(player.CurrentTeamAbbreviation))
        {
            return Results.Ok(new LinemateHistoryDto(id, player.Name, []));
        }

        var (lines, _) = await lineRepository.GetByTeamAsync(
            player.CurrentTeamAbbreviation,
            season ?? DateTime.Now.Year,
            situation,
            cancellationToken: cancellationToken);

        // Filter to lines containing this player
        var playerLines = lines
            .Where(l => l.Player1Id == id || l.Player2Id == id || l.Player3Id == id)
            .ToList();

        // Aggregate linemate stats
        var linemateStats = new Dictionary<int, LinemateBuilder>();

        foreach (var line in playerLines)
        {
            // Add stats for each linemate (not the player themselves)
            if (line.Player1Id != id)
                AddLinemate(linemateStats, line.Player1Id, line.Player1?.Name ?? "Unknown", line);
            if (line.Player2Id != id)
                AddLinemate(linemateStats, line.Player2Id, line.Player2?.Name ?? "Unknown", line);
            if (line.Player3Id.HasValue && line.Player3Id != id)
                AddLinemate(linemateStats, line.Player3Id.Value, line.Player3?.Name ?? "Unknown", line);
        }

        var linemates = linemateStats.Values
            .Select(l => l.ToLinemateDto())
            .OrderByDescending(l => l.TotalIceTimeSeconds)
            .ToList();

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

    private static void AddLinemate(Dictionary<int, LinemateBuilder> stats, int playerId, string name, Data.Entities.LineCombination line)
    {
        if (!stats.TryGetValue(playerId, out var builder))
        {
            builder = new LinemateBuilder(playerId, name);
            stats[playerId] = builder;
        }
        builder.Add(line);
    }

    private class LinemateBuilder(int playerId, string name)
    {
        private int _totalIceTime;
        private int _gamesPlayed;
        private int _goalsFor;
        private int _goalsAgainst;
        private decimal _xgFor;
        private decimal _xgAgainst;

        public void Add(Data.Entities.LineCombination line)
        {
            _totalIceTime += line.IceTimeSeconds;
            _gamesPlayed += line.GamesPlayed;
            _goalsFor += line.GoalsFor;
            _goalsAgainst += line.GoalsAgainst;
            _xgFor += line.ExpectedGoalsFor ?? 0;
            _xgAgainst += line.ExpectedGoalsAgainst ?? 0;
        }

        public LinemateDto ToLinemateDto()
        {
            var totalXg = _xgFor + _xgAgainst;
            return new LinemateDto(
                playerId,
                name,
                _totalIceTime,
                _gamesPlayed,
                _goalsFor,
                _goalsAgainst,
                totalXg > 0 ? Math.Round(_xgFor / totalXg, 2) : null
            );
        }
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
