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
            avgXgPct
        );
    }
}
