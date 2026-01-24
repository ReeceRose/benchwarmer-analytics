using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class StatsRepository(AppDbContext db) : IStatsRepository
{
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
        var minIceTime = isEvenStrength ? 500 * 60 : 50 * 60; // 500 min for 5on5, 50 min for special teams
        var minGoals = isEvenStrength ? 10 : 3; // 10 goals for 5on5, 3 for special teams
        var minLineToi = isEvenStrength ? 300 * 60 : 30 * 60; // 300 min for 5on5, 30 min for special teams

        // Base query for skater stats with player info
        var statsQuery = db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs)
            .Where(s => s.Player != null);

        // Points leaders (Goals + Assists)
        var pointsLeaders = await statsQuery
            .OrderByDescending(s => s.Goals + s.Assists)
            .Take(leaderCount)
            .Select(s => new LeaderEntry(
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Goals + s.Assists
            ))
            .ToListAsync(cancellationToken);

        // Goals leaders
        var goalsLeaders = await statsQuery
            .OrderByDescending(s => s.Goals)
            .Take(leaderCount)
            .Select(s => new LeaderEntry(
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Goals
            ))
            .ToListAsync(cancellationToken);

        // Expected Goals leaders (only include players with xG data)
        var xgLeaders = await statsQuery
            .Where(s => s.ExpectedGoals.HasValue)
            .OrderByDescending(s => s.ExpectedGoals)
            .Take(leaderCount)
            .Select(s => new LeaderEntry(
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.ExpectedGoals ?? 0
            ))
            .ToListAsync(cancellationToken);

        // Corsi% leaders (minimum ice time filter to avoid small sample noise)
        var corsiLeaders = await statsQuery
            .Where(s => s.CorsiForPct.HasValue && s.IceTimeSeconds >= minIceTime)
            .OrderByDescending(s => s.CorsiForPct)
            .Take(leaderCount)
            .Select(s => new LeaderEntry(
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.CorsiForPct ?? 0
            ))
            .ToListAsync(cancellationToken);

        // Ice time leaders
        var iceTimeLeaders = await statsQuery
            .OrderByDescending(s => s.IceTimeSeconds)
            .Take(leaderCount)
            .Select(s => new LeaderEntry(
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.IceTimeSeconds
            ))
            .ToListAsync(cancellationToken);

        // Outliers: players with biggest positive differential (Goals - xG)
        // Minimum goals filter to make it interesting
        var runningHot = await statsQuery
            .Where(s => s.ExpectedGoals.HasValue && s.Goals >= minGoals)
            .Select(s => new
            {
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                Differential = s.Goals - (s.ExpectedGoals ?? 0)
            })
            .OrderByDescending(s => s.Differential)
            .Take(outlierCount)
            .ToListAsync(cancellationToken);

        var runningHotEntries = runningHot
            .Select(s => new OutlierEntry(
                s.PlayerId,
                s.Name,
                s.Team,
                s.Position,
                s.Goals,
                s.ExpectedGoals,
                s.Differential
            ))
            .ToList();

        // Outliers: players with biggest negative differential (due for positive regression)
        var runningCold = await statsQuery
            .Where(s => s.ExpectedGoals.HasValue && s.ExpectedGoals >= minGoals)
            .Select(s => new
            {
                s.PlayerId,
                s.Player!.Name,
                s.Team,
                s.Player.Position,
                s.Goals,
                ExpectedGoals = s.ExpectedGoals ?? 0,
                Differential = s.Goals - (s.ExpectedGoals ?? 0)
            })
            .OrderBy(s => s.Differential)
            .Take(outlierCount)
            .ToListAsync(cancellationToken);

        var runningColdEntries = runningCold
            .Select(s => new OutlierEntry(
                s.PlayerId,
                s.Name,
                s.Team,
                s.Position,
                s.Goals,
                s.ExpectedGoals,
                s.Differential
            ))
            .ToList();

        // Top lines by xG% (forward lines only - 3 players)
        var topLines = await db.LineCombinations
            .Include(l => l.Player1)
            .Include(l => l.Player2)
            .Include(l => l.Player3)
            .Where(l => l.Season == season && l.Situation == situation)
            .Where(l => l.Player3Id.HasValue) // Forward lines have 3 players
            .Where(l => l.ExpectedGoalsPct.HasValue && l.IceTimeSeconds >= minLineToi)
            .OrderByDescending(l => l.ExpectedGoalsPct)
            .Take(topLinesCount)
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
                l.GoalsAgainst
            ))
            .ToListAsync(cancellationToken);

        // League averages - handle empty data gracefully
        var corsiQuery = statsQuery
            .Where(s => s.CorsiForPct.HasValue && s.IceTimeSeconds >= minIceTime);
        var avgCorsi = await corsiQuery.AnyAsync(cancellationToken)
            ? await corsiQuery.AverageAsync(s => s.CorsiForPct ?? 50m, cancellationToken)
            : 50m;

        var xgPctQuery = db.LineCombinations
            .Where(l => l.Season == season && l.Situation == situation)
            .Where(l => l.ExpectedGoalsPct.HasValue && l.IceTimeSeconds >= minLineToi);
        var avgXgPct = await xgPctQuery.AnyAsync(cancellationToken)
            ? await xgPctQuery.AverageAsync(l => l.ExpectedGoalsPct ?? 50m, cancellationToken)
            : 50m;

        // Goalie leaders - use "all" situation for goalies since they don't have 5on5 splits like skaters
        var minGoalieGames = 10;
        var goalieQuery = db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGoalieGames);

        // Save Percentage leaders (higher is better)
        var savePctLeaders = await goalieQuery
            .Where(g => g.SavePercentage.HasValue)
            .OrderByDescending(g => g.SavePercentage)
            .Take(leaderCount)
            .Select(g => new LeaderEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                "G",
                g.SavePercentage ?? 0
            ))
            .ToListAsync(cancellationToken);

        // Goals Against Average leaders (lower is better)
        var gaaLeaders = await goalieQuery
            .Where(g => g.GoalsAgainstAverage.HasValue)
            .OrderBy(g => g.GoalsAgainstAverage)
            .Take(leaderCount)
            .Select(g => new LeaderEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                "G",
                g.GoalsAgainstAverage ?? 0
            ))
            .ToListAsync(cancellationToken);

        // Goals Saved Above Expected leaders (higher is better)
        var gsaxLeaders = await goalieQuery
            .Where(g => g.GoalsSavedAboveExpected.HasValue)
            .OrderByDescending(g => g.GoalsSavedAboveExpected)
            .Take(leaderCount)
            .Select(g => new LeaderEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                "G",
                g.GoalsSavedAboveExpected ?? 0
            ))
            .ToListAsync(cancellationToken);

        var goalieLeaders = new GoalieLeaderboards(savePctLeaders, gaaLeaders, gsaxLeaders);

        // Goalie outliers - goalies with biggest positive GSAx (running hot / lucky)
        var goaliesRunningHot = await goalieQuery
            .Where(g => g.GoalsSavedAboveExpected.HasValue && g.ExpectedGoalsAgainst.HasValue)
            .OrderByDescending(g => g.GoalsSavedAboveExpected)
            .Take(outlierCount)
            .Select(g => new GoalieOutlierEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                g.GoalsAgainst,
                g.ExpectedGoalsAgainst ?? 0,
                g.GoalsSavedAboveExpected ?? 0
            ))
            .ToListAsync(cancellationToken);

        // Goalie outliers - goalies with biggest negative GSAx (running cold / due for regression)
        var goaliesRunningCold = await goalieQuery
            .Where(g => g.GoalsSavedAboveExpected.HasValue && g.ExpectedGoalsAgainst.HasValue)
            .OrderBy(g => g.GoalsSavedAboveExpected)
            .Take(outlierCount)
            .Select(g => new GoalieOutlierEntry(
                g.PlayerId,
                g.Player!.Name,
                g.Team,
                g.GoalsAgainst,
                g.ExpectedGoalsAgainst ?? 0,
                g.GoalsSavedAboveExpected ?? 0
            ))
            .ToListAsync(cancellationToken);

        var goalieOutliers = new GoalieOutliers(goaliesRunningHot, goaliesRunningCold);

        return new HomepageStats(
            pointsLeaders,
            goalsLeaders,
            xgLeaders,
            corsiLeaders,
            iceTimeLeaders,
            runningHotEntries,
            runningColdEntries,
            topLines,
            avgCorsi,
            avgXgPct,
            goalieLeaders,
            goalieOutliers
        );
    }

    /// <summary>
    /// Minimum ice time in seconds for even strength rate stats (500 minutes).
    /// </summary>
    private const int MinEvenStrengthIceTimeSeconds = 500 * 60;

    /// <summary>
    /// Minimum ice time in seconds for special teams rate stats (50 minutes).
    /// </summary>
    private const int MinSpecialTeamsIceTimeSeconds = 50 * 60;

    public async Task<LeaderboardResult> GetLeaderboardAsync(
        string category,
        int season,
        string situation,
        int limit = 50,
        bool ascending = false,
        CancellationToken cancellationToken = default)
    {
        // Goalie categories always use "all" situation
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
        // Adjust minimum ice time based on situation
        var isEvenStrength = situation == "5on5" || situation == "all";
        var minIceTime = isEvenStrength ? MinEvenStrengthIceTimeSeconds : MinSpecialTeamsIceTimeSeconds;

        var baseQuery = db.SkaterSeasons
            .Include(s => s.Player)
            .Where(s => s.Season == season && s.Situation == situation && !s.IsPlayoffs)
            .Where(s => s.Player != null);

        // For rate stats (Corsi%), require minimum ice time
        if (category.Equals("corsiPct", StringComparison.OrdinalIgnoreCase))
        {
            baseQuery = baseQuery.Where(s => s.IceTimeSeconds >= minIceTime);
        }

        // Project to anonymous type with all needed fields, then sort by category
        var query = baseQuery.Select(s => new
        {
            s.PlayerId,
            Name = s.Player!.Name,
            s.Team,
            Position = s.Player.Position,
            s.GamesPlayed,
            s.Goals,
            s.Assists,
            Points = s.Goals + s.Assists,
            ExpectedGoals = s.ExpectedGoals ?? 0m,
            CorsiForPct = s.CorsiForPct ?? 0m,
            s.IceTimeSeconds
        });

        // Apply sorting based on category
        var orderedQuery = (category.ToLowerInvariant(), ascending) switch
        {
            ("points", false) => query.OrderByDescending(s => s.Points),
            ("points", true) => query.OrderBy(s => s.Points),
            ("goals", false) => query.OrderByDescending(s => s.Goals),
            ("goals", true) => query.OrderBy(s => s.Goals),
            ("assists", false) => query.OrderByDescending(s => s.Assists),
            ("assists", true) => query.OrderBy(s => s.Assists),
            ("expectedgoals", false) => query.OrderByDescending(s => s.ExpectedGoals),
            ("expectedgoals", true) => query.OrderBy(s => s.ExpectedGoals),
            ("corsipct", false) => query.OrderByDescending(s => s.CorsiForPct),
            ("corsipct", true) => query.OrderBy(s => s.CorsiForPct),
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
                "expectedgoals" => s.ExpectedGoals,
                "corsipct" => s.CorsiForPct,
                "icetime" => s.IceTimeSeconds,
                "gamesplayed" => s.GamesPlayed,
                _ => s.Points
            },
            GamesPlayed: s.GamesPlayed,
            Goals: s.Goals,
            Assists: s.Assists,
            ExpectedGoals: s.ExpectedGoals,
            CorsiForPct: s.CorsiForPct,
            IceTimeSeconds: s.IceTimeSeconds,
            SavePercentage: null,
            GoalsAgainstAverage: null,
            GoalsSavedAboveExpected: null,
            ShotsAgainst: null
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

        var baseQuery = db.GoalieSeasons
            .Include(g => g.Player)
            .Where(g => g.Season == season && g.Situation == "all" && !g.IsPlayoffs)
            .Where(g => g.Player != null && g.GamesPlayed >= minGoalieGames);

        var query = baseQuery.Select(g => new
        {
            g.PlayerId,
            Name = g.Player!.Name,
            g.Team,
            g.GamesPlayed,
            SavePercentage = g.SavePercentage ?? 0m,
            GoalsAgainstAverage = g.GoalsAgainstAverage ?? 0m,
            GoalsSavedAboveExpected = g.GoalsSavedAboveExpected ?? 0m,
            g.ShotsAgainst,
            g.GoalsAgainst
        });

        // Apply sorting based on category
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
                _ => g.SavePercentage
            },
            GamesPlayed: g.GamesPlayed,
            Goals: null,
            Assists: null,
            ExpectedGoals: null,
            CorsiForPct: null,
            IceTimeSeconds: null,
            SavePercentage: g.SavePercentage,
            GoalsAgainstAverage: g.GoalsAgainstAverage,
            GoalsSavedAboveExpected: g.GoalsSavedAboveExpected,
            ShotsAgainst: g.ShotsAgainst
        )).ToList();

        return new LeaderboardResult(category, totalCount, entries);
    }
}
