using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class GameStatsRepository(IDbContextFactory<AppDbContext> dbFactory) : IGameStatsRepository
{
    private const decimal HighDangerThreshold = 0.15m;
    private const decimal MediumDangerThreshold = 0.06m;

    public async Task<GameStats?> GetGameStatsAsync(string gameId, CancellationToken cancellationToken = default)
    {
        var stats = await GetGameStatsBatchAsync([gameId], cancellationToken);
        return stats.FirstOrDefault();
    }

    public async Task<IReadOnlyList<GameStats>> GetGameStatsBatchAsync(IEnumerable<string> gameIds, CancellationToken cancellationToken = default)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var gameIdList = gameIds.ToList();
        if (gameIdList.Count == 0) return [];

        var shots = await db.Shots
            .Where(s => gameIdList.Contains(s.GameId))
            .Select(s => new ShotProjection(
                s.GameId,
                s.Period,
                s.HomeTeamCode,
                s.AwayTeamCode,
                s.IsHomeTeam,
                s.IsGoal,
                s.ShotWasOnGoal,
                s.XGoal,
                s.ShotDistance,
                s.ShotAngle
            ))
            .ToListAsync(cancellationToken);

        var shotsByGame = shots.GroupBy(s => s.GameId);
        var results = new List<GameStats>();

        foreach (var gameShots in shotsByGame)
        {
            var gameId = gameShots.Key;
            var firstShot = gameShots.First();
            var homeTeamCode = firstShot.HomeTeamCode;
            var awayTeamCode = firstShot.AwayTeamCode;

            var homeShots = gameShots.Where(s => s.IsHomeTeam).ToList();
            var awayShots = gameShots.Where(s => !s.IsHomeTeam).ToList();

            var homeStats = CalculateTeamStats(homeTeamCode, homeShots);
            var awayStats = CalculateTeamStats(awayTeamCode, awayShots);

            var periods = gameShots
                .GroupBy(s => s.Period)
                .OrderBy(g => g.Key)
                .Select(g => new PeriodStats(
                    Period: g.Key,
                    HomeShots: g.Count(s => s.IsHomeTeam),
                    AwayShots: g.Count(s => !s.IsHomeTeam),
                    HomeGoals: g.Count(s => s.IsHomeTeam && s.IsGoal),
                    AwayGoals: g.Count(s => !s.IsHomeTeam && s.IsGoal),
                    HomeXG: g.Where(s => s.IsHomeTeam).Sum(s => s.XGoal ?? 0),
                    AwayXG: g.Where(s => !s.IsHomeTeam).Sum(s => s.XGoal ?? 0)
                ))
                .ToList();

            results.Add(new GameStats(gameId, homeStats, awayStats, periods));
        }

        return results;
    }

    private TeamStats CalculateTeamStats(string teamCode, List<ShotProjection> shots)
    {
        if (shots.Count == 0)
        {
            return new TeamStats(
                TeamCode: teamCode,
                TotalShots: 0,
                ShotsOnGoal: 0,
                Goals: 0,
                ExpectedGoals: 0,
                GoalsVsXgDiff: 0,
                AvgShotDistance: 0,
                AvgShotAngle: 0,
                HighDangerChances: 0,
                MediumDangerChances: 0,
                LowDangerChances: 0
            );
        }

        var totalShots = shots.Count;
        var shotsOnGoal = shots.Count(s => s.ShotWasOnGoal);
        var goals = shots.Count(s => s.IsGoal);
        var xg = shots.Sum(s => s.XGoal ?? 0);
        var shotsWithDistance = shots.Where(s => s.ShotDistance.HasValue).ToList();
        var shotsWithAngle = shots.Where(s => s.ShotAngle.HasValue).ToList();
        var avgDistance = shotsWithDistance.Count > 0 ? shotsWithDistance.Average(s => s.ShotDistance!.Value) : 0;
        var avgAngle = shotsWithAngle.Count > 0 ? shotsWithAngle.Average(s => s.ShotAngle!.Value) : 0;

        var highDanger = shots.Count(s => (s.XGoal ?? 0) >= HighDangerThreshold);
        var mediumDanger = shots.Count(s =>
        {
            var shotXg = s.XGoal ?? 0;
            return shotXg >= MediumDangerThreshold && shotXg < HighDangerThreshold;
        });
        var lowDanger = shots.Count(s => (s.XGoal ?? 0) < MediumDangerThreshold);

        return new TeamStats(
            TeamCode: teamCode,
            TotalShots: totalShots,
            ShotsOnGoal: shotsOnGoal,
            Goals: goals,
            ExpectedGoals: Math.Round(xg, 2),
            GoalsVsXgDiff: Math.Round(goals - xg, 2),
            AvgShotDistance: Math.Round(avgDistance, 1),
            AvgShotAngle: Math.Round(avgAngle, 1),
            HighDangerChances: highDanger,
            MediumDangerChances: mediumDanger,
            LowDangerChances: lowDanger
        );
    }

    private record ShotProjection(
        string GameId,
        int Period,
        string HomeTeamCode,
        string AwayTeamCode,
        bool IsHomeTeam,
        bool IsGoal,
        bool ShotWasOnGoal,
        decimal? XGoal,
        decimal? ShotDistance,
        decimal? ShotAngle
    );
}
