using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class StatsRepository(IDbContextFactory<AppDbContext> dbFactory) : IStatsRepository
{
    /// <summary>
    /// Minimum ice time in seconds for even strength rate stats (500 minutes).
    /// </summary>
    private const int MinEvenStrengthIceTimeSeconds = 500 * 60;

    /// <summary>
    /// Minimum ice time in seconds for special teams rate stats (50 minutes).
    /// </summary>
    private const int MinSpecialTeamsIceTimeSeconds = 50 * 60;

    public async Task<HomepageStats> GetHomepageStatsAsync(
        int season,
        string situation,
        int leaderCount = 5,
        int outlierCount = 5,
        int topLinesCount = 5,
        CancellationToken cancellationToken = default)
    {
        // Adjust thresholds based on situation - special teams have much less ice time
        var isEvenStrength = situation == "5on5" || situation == "all";
        var minIceTime = isEvenStrength ? 500 * 60 : 50 * 60;
        var minGoals = isEvenStrength ? 10 : 3;
        var minLineToi = isEvenStrength ? 300 * 60 : 30 * 60;
        const int minGoalieGames = 10;

        // Run all independent queries in parallel
        var pointsTask = GetPointsLeadersAsync(season, situation, leaderCount, cancellationToken);
        var goalsTask = GetGoalsLeadersAsync(season, situation, leaderCount, cancellationToken);
        var xgTask = GetXgLeadersAsync(season, situation, leaderCount, cancellationToken);
        var corsiTask = GetCorsiLeadersAsync(season, situation, leaderCount, minIceTime, cancellationToken);
        var iceTimeTask = GetIceTimeLeadersAsync(season, situation, leaderCount, cancellationToken);
        var runningHotTask = GetRunningHotAsync(season, situation, outlierCount, minGoals, cancellationToken);
        var runningColdTask = GetRunningColdAsync(season, situation, outlierCount, minGoals, cancellationToken);
        var topLinesTask = GetTopLinesInternalAsync(season, situation, topLinesCount, minLineToi, cancellationToken);
        var avgCorsiTask = GetAvgCorsiAsync(season, situation, minIceTime, cancellationToken);
        var avgXgPctTask = GetAvgXgPctAsync(season, situation, minLineToi, cancellationToken);
        var savePctTask = GetSavePctLeadersAsync(season, leaderCount, minGoalieGames, cancellationToken);
        var gaaTask = GetGaaLeadersAsync(season, leaderCount, minGoalieGames, cancellationToken);
        var gsaxTask = GetGsaxLeadersAsync(season, leaderCount, minGoalieGames, cancellationToken);
        var goaliesHotTask = GetGoaliesRunningHotAsync(season, outlierCount, minGoalieGames, cancellationToken);
        var goaliesColdTask = GetGoaliesRunningColdAsync(season, outlierCount, minGoalieGames, cancellationToken);

        await Task.WhenAll(
            pointsTask, goalsTask, xgTask, corsiTask, iceTimeTask,
            runningHotTask, runningColdTask, topLinesTask,
            avgCorsiTask, avgXgPctTask,
            savePctTask, gaaTask, gsaxTask, goaliesHotTask, goaliesColdTask);

        var goalieLeaders = new GoalieLeaderboards(
            await savePctTask,
            await gaaTask,
            await gsaxTask);

        var goalieOutliers = new GoalieOutliers(
            await goaliesHotTask,
            await goaliesColdTask);

        return new HomepageStats(
            await pointsTask,
            await goalsTask,
            await xgTask,
            await corsiTask,
            await iceTimeTask,
            await runningHotTask,
            await runningColdTask,
            await topLinesTask,
            await avgCorsiTask,
            await avgXgPctTask,
            goalieLeaders,
            goalieOutliers);
    }

    private async Task<List<LeaderEntry>> GetPointsLeadersAsync(
        int season, string situation, int count, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .OrderByDescending(s => s.Goals + s.Assists)
            .Take(count)
            .Select(s => new LeaderEntry(s.PlayerId, s.Player!.Name, s.Team, s.Player.Position, s.Goals + s.Assists))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetGoalsLeadersAsync(
        int season, string situation, int count, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .OrderByDescending(s => s.Goals)
            .Take(count)
            .Select(s => new LeaderEntry(s.PlayerId, s.Player!.Name, s.Team, s.Player.Position, s.Goals))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetXgLeadersAsync(
        int season, string situation, int count, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .Where(s => s.ExpectedGoals.HasValue)
            .OrderByDescending(s => s.ExpectedGoals)
            .Take(count)
            .Select(s => new LeaderEntry(s.PlayerId, s.Player!.Name, s.Team, s.Player.Position, s.ExpectedGoals ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetCorsiLeadersAsync(
        int season, string situation, int count, int minIceTime, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .Where(s => s.CorsiForPct.HasValue && s.IceTimeSeconds >= minIceTime)
            .OrderByDescending(s => s.CorsiForPct)
            .Take(count)
            .Select(s => new LeaderEntry(s.PlayerId, s.Player!.Name, s.Team, s.Player.Position, s.CorsiForPct ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetIceTimeLeadersAsync(
        int season, string situation, int count, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .OrderByDescending(s => s.IceTimeSeconds)
            .Take(count)
            .Select(s => new LeaderEntry(s.PlayerId, s.Player!.Name, s.Team, s.Player.Position, s.IceTimeSeconds))
            .ToListAsync(ct);
    }

    private async Task<List<OutlierEntry>> GetRunningHotAsync(
        int season, string situation, int count, int minGoals, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var results = await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .Where(s => s.ExpectedGoals.HasValue && s.Goals >= minGoals)
            .Select(s => new
            {
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Player.HeadshotUrl,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                Differential = s.Goals - (s.ExpectedGoals ?? 0)
            })
            .OrderByDescending(s => s.Differential)
            .Take(count)
            .ToListAsync(ct);

        return results
            .Select(s => new OutlierEntry(s.PlayerId, s.Name, s.Team, s.Position, s.HeadshotUrl, s.Goals, s.ExpectedGoals, s.Differential))
            .ToList();
    }

    private async Task<List<OutlierEntry>> GetRunningColdAsync(
        int season, string situation, int count, int minGoals, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var results = await db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs && s.Player != null)
            .Where(s => s.ExpectedGoals.HasValue && s.ExpectedGoals >= minGoals)
            .Select(s => new
            {
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Player.HeadshotUrl,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                Differential = s.Goals - (s.ExpectedGoals ?? 0)
            })
            .OrderBy(s => s.Differential)
            .Take(count)
            .ToListAsync(ct);

        return results
            .Select(s => new OutlierEntry(s.PlayerId, s.Name, s.Team, s.Position, s.HeadshotUrl, s.Goals, s.ExpectedGoals, s.Differential))
            .ToList();
    }

    private async Task<List<TopLine>> GetTopLinesInternalAsync(
        int season, string situation, int count, int minLineToi, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.LineCombinations
            .Include(l => l.Player1)
            .Include(l => l.Player2)
            .Include(l => l.Player3)
            .Where(l => l.Season == season && l.Situation == situation)
            .Where(l => l.Player3Id.HasValue)
            .Where(l => l.ExpectedGoalsPct.HasValue && l.IceTimeSeconds >= minLineToi)
            .OrderByDescending(l => l.ExpectedGoalsPct)
            .Take(count)
            .Select(l => new TopLine(
                l.Id,
                l.Team,
                new List<LinePlayer>
                {
                    new(l.Player1Id, l.Player1!.Name, l.Player1.Position),
                    new(l.Player2Id, l.Player2!.Name, l.Player2.Position),
                    new(l.Player3Id!.Value, l.Player3!.Name, l.Player3.Position)
                },
                l.IceTimeSeconds,
                l.ExpectedGoalsPct,
                l.GoalsFor,
                l.GoalsAgainst))
            .ToListAsync(ct);
    }

    private async Task<decimal> GetAvgCorsiAsync(
        int season, string situation, int minIceTime, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var query = db.SkaterSeasons
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs)
            .Where(s => s.CorsiForPct.HasValue && s.IceTimeSeconds >= minIceTime);

        return await query.AnyAsync(ct)
            ? await query.AverageAsync(s => s.CorsiForPct ?? 50m, ct)
            : 50m;
    }

    private async Task<decimal> GetAvgXgPctAsync(
        int season, string situation, int minLineToi, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var query = db.LineCombinations
            .Where(l => l.Season == season && l.Situation == situation)
            .Where(l => l.ExpectedGoalsPct.HasValue && l.IceTimeSeconds >= minLineToi);

        return await query.AnyAsync(ct)
            ? await query.AverageAsync(l => l.ExpectedGoalsPct ?? 50m, ct)
            : 50m;
    }

    private async Task<List<LeaderEntry>> GetSavePctLeadersAsync(
        int season, int count, int minGames, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGames)
            .Where(g => g.SavePercentage.HasValue)
            .OrderByDescending(g => g.SavePercentage)
            .Take(count)
            .Select(g => new LeaderEntry(g.PlayerId, g.Player!.Name, g.Team, "G", g.SavePercentage ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetGaaLeadersAsync(
        int season, int count, int minGames, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGames)
            .Where(g => g.GoalsAgainstAverage.HasValue)
            .OrderBy(g => g.GoalsAgainstAverage)
            .Take(count)
            .Select(g => new LeaderEntry(g.PlayerId, g.Player!.Name, g.Team, "G", g.GoalsAgainstAverage ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<LeaderEntry>> GetGsaxLeadersAsync(
        int season, int count, int minGames, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGames)
            .Where(g => g.GoalsSavedAboveExpected.HasValue)
            .OrderByDescending(g => g.GoalsSavedAboveExpected)
            .Take(count)
            .Select(g => new LeaderEntry(g.PlayerId, g.Player!.Name, g.Team, "G", g.GoalsSavedAboveExpected ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<GoalieOutlierEntry>> GetGoaliesRunningHotAsync(
        int season, int count, int minGames, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGames)
            .Where(g => g.GoalsSavedAboveExpected.HasValue && g.ExpectedGoalsAgainst.HasValue)
            .OrderByDescending(g => g.GoalsSavedAboveExpected)
            .Take(count)
            .Select(g => new GoalieOutlierEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                g.Player.HeadshotUrl,
                g.GoalsAgainst,
                g.ExpectedGoalsAgainst ?? 0,
                g.GoalsSavedAboveExpected ?? 0))
            .ToListAsync(ct);
    }

    private async Task<List<GoalieOutlierEntry>> GetGoaliesRunningColdAsync(
        int season, int count, int minGames, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGames)
            .Where(g => g.GoalsSavedAboveExpected.HasValue && g.ExpectedGoalsAgainst.HasValue)
            .OrderBy(g => g.GoalsSavedAboveExpected)
            .Take(count)
            .Select(g => new GoalieOutlierEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                g.Player.HeadshotUrl,
                g.GoalsAgainst,
                g.ExpectedGoalsAgainst ?? 0,
                g.GoalsSavedAboveExpected ?? 0))
            .ToListAsync(ct);
    }

    public async Task<LeaderboardResult> GetLeaderboardAsync(
        string category,
        int season,
        string situation,
        int limit = 50,
        bool ascending = false,
        CancellationToken cancellationToken = default)
    {
        var isGoalieCategory = LeaderboardCategories.IsGoalieCategory(category);

        if (isGoalieCategory)
        {
            return await GetGoalieLeaderboardAsync(category, season, limit, ascending, cancellationToken);
        }

        return await GetSkaterLeaderboardAsync(category, season, situation, limit, ascending, cancellationToken);
    }

    private async Task<LeaderboardResult> GetSkaterLeaderboardAsync(
        string category,
        int season,
        string situation,
        int limit,
        bool ascending,
        CancellationToken cancellationToken)
    {
        var isEvenStrength = situation == "5on5" || situation == "all";
        var minIceTime = isEvenStrength ? MinEvenStrengthIceTimeSeconds : MinSpecialTeamsIceTimeSeconds;

        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var baseQuery = db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs)
            .Where(s => s.Player != null);

        if (category.Equals("corsiPct", StringComparison.OrdinalIgnoreCase))
        {
            baseQuery = baseQuery.Where(s => s.IceTimeSeconds >= minIceTime);
        }

        var query = baseQuery.Select(s => new
        {
            s.PlayerId,
            s.Player!.Name,
            s.Team,
            s.Player.Position,
            s.GamesPlayed,
            s.Goals,
            s.Assists,
            s.Shots,
            Points = s.Goals + s.Assists,
            ExpectedGoals = s.ExpectedGoals ?? 0m,
            s.ExpectedGoalsPer60,
            CorsiForPct = s.CorsiForPct ?? 0m,
            s.FenwickForPct,
            s.OnIceShootingPct,
            s.OnIceSavePct,
            s.IceTimeSeconds
        });

        var orderedQuery = (category.ToLowerInvariant(), ascending) switch
        {
            ("points", false) => query.OrderByDescending(s => s.Points),
            ("points", true) => query.OrderBy(s => s.Points),
            ("goals", false) => query.OrderByDescending(s => s.Goals),
            ("goals", true) => query.OrderBy(s => s.Goals),
            ("assists", false) => query.OrderByDescending(s => s.Assists),
            ("assists", true) => query.OrderBy(s => s.Assists),
            ("shots", false) => query.OrderByDescending(s => s.Shots),
            ("shots", true) => query.OrderBy(s => s.Shots),
            ("expectedgoals", false) => query.OrderByDescending(s => s.ExpectedGoals),
            ("expectedgoals", true) => query.OrderBy(s => s.ExpectedGoals),
            ("xgper60", false) => query.OrderByDescending(s => s.ExpectedGoalsPer60),
            ("xgper60", true) => query.OrderBy(s => s.ExpectedGoalsPer60),
            ("corsipct", false) => query.OrderByDescending(s => s.CorsiForPct),
            ("corsipct", true) => query.OrderBy(s => s.CorsiForPct),
            ("fenwickpct", false) => query.OrderByDescending(s => s.FenwickForPct),
            ("fenwickpct", true) => query.OrderBy(s => s.FenwickForPct),
            ("oishpct", false) => query.OrderByDescending(s => s.OnIceShootingPct),
            ("oishpct", true) => query.OrderBy(s => s.OnIceShootingPct),
            ("oisvpct", false) => query.OrderByDescending(s => s.OnIceSavePct),
            ("oisvpct", true) => query.OrderBy(s => s.OnIceSavePct),
            ("icetime", false) => query.OrderByDescending(s => s.IceTimeSeconds),
            ("icetime", true) => query.OrderBy(s => s.IceTimeSeconds),
            ("gamesplayed", false) => query.OrderByDescending(s => s.GamesPlayed),
            ("gamesplayed", true) => query.OrderBy(s => s.GamesPlayed),
            (_, false) => query.OrderByDescending(s => s.Points),
            (_, true) => query.OrderBy(s => s.Points)
        };

        var results = await orderedQuery
            .Take(limit)
            .ToListAsync(cancellationToken);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var entries = results.Select((s, index) => new LeaderboardResultEntry(
            Rank: index + 1,
            PlayerId: s.PlayerId,
            Name: s.Name,
            Team: s.Team,
            Position: s.Position,
            PrimaryValue: category.ToLowerInvariant() switch
            {
                "points" => s.Points,
                "goals" => s.Goals,
                "assists" => s.Assists,
                "shots" => s.Shots,
                "expectedgoals" => s.ExpectedGoals,
                "xgper60" => s.ExpectedGoalsPer60 ?? 0,
                "corsipct" => s.CorsiForPct,
                "fenwickpct" => s.FenwickForPct ?? 0,
                "oishpct" => s.OnIceShootingPct ?? 0,
                "oisvpct" => s.OnIceSavePct ?? 0,
                "icetime" => s.IceTimeSeconds,
                "gamesplayed" => s.GamesPlayed,
                _ => s.Points
            },
            GamesPlayed: s.GamesPlayed,
            Goals: s.Goals,
            Assists: s.Assists,
            Shots: s.Shots,
            ExpectedGoals: s.ExpectedGoals,
            ExpectedGoalsPer60: s.ExpectedGoalsPer60,
            CorsiForPct: s.CorsiForPct,
            FenwickForPct: s.FenwickForPct,
            OnIceShootingPct: s.OnIceShootingPct,
            OnIceSavePct: s.OnIceSavePct,
            IceTimeSeconds: s.IceTimeSeconds,
            SavePercentage: null,
            GoalsAgainstAverage: null,
            GoalsSavedAboveExpected: null,
            ShotsAgainst: null,
            GoalieIceTimeSeconds: null,
            GoalsAgainst: null,
            ExpectedGoalsAgainst: null,
            HighDangerShots: null,
            HighDangerGoals: null,
            MediumDangerShots: null,
            MediumDangerGoals: null,
            LowDangerShots: null,
            LowDangerGoals: null,
            Rebounds: null,
            ExpectedRebounds: null
        )).ToList();

        return new LeaderboardResult(category, totalCount, entries);
    }

    private async Task<LeaderboardResult> GetGoalieLeaderboardAsync(
        string category,
        int season,
        int limit,
        bool ascending,
        CancellationToken cancellationToken)
    {
        const int minGoalieGames = 10;

        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var baseQuery = db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGoalieGames);

        var query = baseQuery.Select(g => new
        {
            g.PlayerId,
            g.Player!.Name,
            g.Team,
            g.GamesPlayed,
            SavePercentage = g.SavePercentage ?? 0m,
            GoalsAgainstAverage = g.GoalsAgainstAverage ?? 0m,
            GoalsSavedAboveExpected = g.GoalsSavedAboveExpected ?? 0m,
            g.ShotsAgainst,
            g.GoalsAgainst,
            g.IceTimeSeconds,
            ExpectedGoalsAgainst = g.ExpectedGoalsAgainst ?? 0m,
            g.HighDangerShots,
            g.HighDangerGoals,
            g.MediumDangerShots,
            g.MediumDangerGoals,
            g.LowDangerShots,
            g.LowDangerGoals,
            g.Rebounds,
            ExpectedRebounds = g.ExpectedRebounds ?? 0m
        });

        var orderedQuery = (category.ToLowerInvariant(), ascending) switch
        {
            ("savepct", false) => query.OrderByDescending(g => g.SavePercentage),
            ("savepct", true) => query.OrderBy(g => g.SavePercentage),
            ("gaa", false) => query.OrderByDescending(g => g.GoalsAgainstAverage),
            ("gaa", true) => query.OrderBy(g => g.GoalsAgainstAverage),
            ("gsax", false) => query.OrderByDescending(g => g.GoalsSavedAboveExpected),
            ("gsax", true) => query.OrderBy(g => g.GoalsSavedAboveExpected),
            ("shotsagainst", false) => query.OrderByDescending(g => g.ShotsAgainst),
            ("shotsagainst", true) => query.OrderBy(g => g.ShotsAgainst),
            // Rebound control: ratio of actual/expected (lower is better, so asc = best)
            ("reboundcontrol", false) => query.Where(g => g.ExpectedRebounds > 0).OrderByDescending(g => (decimal)g.Rebounds / g.ExpectedRebounds),
            ("reboundcontrol", true) => query.Where(g => g.ExpectedRebounds > 0).OrderBy(g => (decimal)g.Rebounds / g.ExpectedRebounds),
            (_, false) => query.OrderByDescending(g => g.SavePercentage),
            (_, true) => query.OrderBy(g => g.SavePercentage)
        };

        var results = await orderedQuery
            .Take(limit)
            .ToListAsync(cancellationToken);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var entries = results.Select((g, index) => new LeaderboardResultEntry(
            Rank: index + 1,
            PlayerId: g.PlayerId,
            Name: g.Name,
            Team: g.Team,
            Position: "G",
            PrimaryValue: category.ToLowerInvariant() switch
            {
                "savepct" => g.SavePercentage,
                "gaa" => g.GoalsAgainstAverage,
                "gsax" => g.GoalsSavedAboveExpected,
                "shotsagainst" => g.ShotsAgainst,
                "goalietime" => g.IceTimeSeconds,
                "goalsagainst" => g.GoalsAgainst,
                "xga" => g.ExpectedGoalsAgainst,
                "reboundcontrol" => g.ExpectedRebounds > 0 ? Math.Round((decimal)g.Rebounds / g.ExpectedRebounds, 2) : 0,
                _ => g.SavePercentage
            },
            GamesPlayed: g.GamesPlayed,
            Goals: null,
            Assists: null,
            Shots: null,
            ExpectedGoals: null,
            ExpectedGoalsPer60: null,
            CorsiForPct: null,
            FenwickForPct: null,
            OnIceShootingPct: null,
            OnIceSavePct: null,
            IceTimeSeconds: null,
            SavePercentage: g.SavePercentage,
            GoalsAgainstAverage: g.GoalsAgainstAverage,
            GoalsSavedAboveExpected: g.GoalsSavedAboveExpected,
            ShotsAgainst: g.ShotsAgainst,
            GoalieIceTimeSeconds: g.IceTimeSeconds,
            GoalsAgainst: g.GoalsAgainst,
            ExpectedGoalsAgainst: g.ExpectedGoalsAgainst,
            HighDangerShots: g.HighDangerShots,
            HighDangerGoals: g.HighDangerGoals,
            MediumDangerShots: g.MediumDangerShots,
            MediumDangerGoals: g.MediumDangerGoals,
            LowDangerShots: g.LowDangerShots,
            LowDangerGoals: g.LowDangerGoals,
            Rebounds: g.Rebounds,
            ExpectedRebounds: g.ExpectedRebounds
        )).ToList();

        return new LeaderboardResult(category, totalCount, entries);
    }

    public async Task<OutliersResult> GetOutliersAsync(
        int season,
        string situation,
        int skaterLimit = 15,
        int goalieLimit = 5,
        CancellationToken cancellationToken = default)
    {
        var isEvenStrength = situation == "5on5" || situation == "all";
        var minIceTime = isEvenStrength ? MinEvenStrengthIceTimeSeconds : MinSpecialTeamsIceTimeSeconds;
        var minGoals = isEvenStrength ? 10 : 3;
        var minLineToi = isEvenStrength ? 300 * 60 : 30 * 60;
        const int minGoalieGames = 10;

        // Run all queries in parallel
        var runningHotTask = GetRunningHotAsync(season, situation, skaterLimit, minGoals, cancellationToken);
        var runningColdTask = GetRunningColdAsync(season, situation, skaterLimit, minGoals, cancellationToken);
        var avgCorsiTask = GetAvgCorsiAsync(season, situation, minIceTime, cancellationToken);
        var avgXgPctTask = GetAvgXgPctAsync(season, situation, minLineToi, cancellationToken);
        var goaliesHotTask = GetGoaliesRunningHotAsync(season, goalieLimit, minGoalieGames, cancellationToken);
        var goaliesColdTask = GetGoaliesRunningColdAsync(season, goalieLimit, minGoalieGames, cancellationToken);

        await Task.WhenAll(runningHotTask, runningColdTask, avgCorsiTask, avgXgPctTask, goaliesHotTask, goaliesColdTask);

        return new OutliersResult(
            await runningHotTask,
            await runningColdTask,
            await goaliesHotTask,
            await goaliesColdTask,
            await avgCorsiTask,
            await avgXgPctTask);
    }

    public async Task<IReadOnlyList<TopLine>> GetTopLinesAsync(
        int season,
        string situation,
        int limit = 5,
        CancellationToken cancellationToken = default)
    {
        var isEvenStrength = situation == "5on5" || situation == "all";
        var minLineToi = isEvenStrength ? 300 * 60 : 30 * 60;

        return await GetTopLinesInternalAsync(season, situation, limit, minLineToi, cancellationToken);
    }

    public async Task<IReadOnlyList<SeasonTrendData>> GetLeagueTrendsAsync(
        string situation,
        CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        // Get accurate team-level data from TeamSeason table
        var teamData = await db.TeamSeasons
            .Where(t => t.Situation == situation && !t.IsPlayoffs)
            .GroupBy(t => t.Season)
            .Select(g => new
            {
                Season = g.Key,
                // Each team-game is one team playing one game
                TotalTeamGames = g.Sum(t => t.GamesPlayed),
                TotalGoals = g.Sum(t => t.GoalsFor),
                TotalShots = g.Sum(t => t.ShotsOnGoalFor),
                TotalExpectedGoals = g.Sum(t => t.XGoalsFor),
                // Weighted CF% by ice time
                WeightedCorsiSum = g.Sum(t => (t.CorsiPercentage ?? 0.50m) * t.IceTime),
                TotalIceTime = g.Sum(t => t.IceTime),
            })
            .OrderBy(g => g.Season)
            .ToListAsync(cancellationToken);

        // Get player counts and assists from SkaterSeasons
        var skaterData = await db.SkaterSeasons
            .Where(s => s.Situation == situation && !s.IsPlayoffs)
            .GroupBy(s => s.Season)
            .Select(g => new
            {
                Season = g.Key,
                TotalPlayers = g.Select(s => s.PlayerId).Distinct().Count(),
                TotalPlayerGames = g.Sum(s => s.GamesPlayed),
                TotalAssists = g.Sum(s => s.Assists),
                TotalIceTimeSeconds = g.Sum(s => s.IceTimeSeconds),
            })
            .ToListAsync(cancellationToken);

        var skaterBySeason = skaterData.ToDictionary(s => s.Season);

        return teamData.Select(d =>
        {
            var skater = skaterBySeason.GetValueOrDefault(d.Season);

            // Goals per team-game (typically ~3.0-3.5)
            var avgGoalsPerGame = d.TotalTeamGames > 0
                ? Math.Round((decimal)d.TotalGoals / d.TotalTeamGames, 2)
                : 0;

            // Assists per team-game
            var avgAssistsPerGame = d.TotalTeamGames > 0
                ? Math.Round((decimal)(skater?.TotalAssists ?? 0) / d.TotalTeamGames, 2)
                : 0;

            // Average TOI per player per game
            var avgToiPerGame = skater?.TotalPlayerGames > 0
                ? Math.Round((decimal)skater.TotalIceTimeSeconds / skater.TotalPlayerGames, 1)
                : 0;

            // CorsiPercentage may be stored as ratio (0.51) or percentage (51.0) - normalize to percentage
            var rawCorsi = d.TotalIceTime > 0
                ? d.WeightedCorsiSum / d.TotalIceTime
                : 0.50m;
            var avgCorsiPct = rawCorsi < 1 ? Math.Round(rawCorsi * 100, 1) : Math.Round(rawCorsi, 1);

            // xG per 60 minutes of ice time (IceTime is in seconds)
            var avgXgPer60 = d.TotalIceTime > 0
                ? Math.Round(d.TotalExpectedGoals / d.TotalIceTime * 3600, 2)
                : 0;

            return new SeasonTrendData(
                d.Season,
                skater?.TotalPlayers ?? 0,
                skater?.TotalPlayerGames ?? 0,
                d.TotalGoals,
                skater?.TotalAssists ?? 0,
                d.TotalShots,
                Math.Round(d.TotalExpectedGoals, 1),
                avgCorsiPct,
                avgGoalsPerGame,
                avgAssistsPerGame,
                avgToiPerGame,
                avgXgPer60
            );
        }).ToList();
    }
}
