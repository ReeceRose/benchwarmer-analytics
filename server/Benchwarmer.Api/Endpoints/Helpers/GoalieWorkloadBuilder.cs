using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for building goalie workload analysis DTOs.
/// </summary>
public static class GoalieWorkloadBuilder
{
    public static List<GoalieGameStatsDto> CalculateGoaliePerGameStats(
        IReadOnlyList<Shot> shots,
        Dictionary<string, Game> gameDateMap)
    {
        return shots
            .GroupBy(s => s.GameId)
            .Select(g =>
            {
                var game = gameDateMap.GetValueOrDefault(g.Key);
                var shotsOnGoal = g.Where(s => s.ShotWasOnGoal).ToList();
                var shotsAgainst = shotsOnGoal.Count;
                var goalsAgainst = shotsOnGoal.Count(s => s.IsGoal);
                var xGA = shotsOnGoal.Sum(s => s.XGoal ?? 0);
                var svPct = shotsAgainst > 0
                    ? Math.Round((decimal)(shotsAgainst - goalsAgainst) / shotsAgainst, 4)
                    : 0;

                var firstShot = g.First();
                var goalieIsHome = !firstShot.IsHomeTeam;
                var opponent = goalieIsHome
                    ? firstShot.AwayTeamCode
                    : firstShot.HomeTeamCode;

                return new GoalieGameStatsDto(
                    g.Key,
                    game?.GameDate ?? DateOnly.MinValue,
                    opponent,
                    goalieIsHome,
                    shotsAgainst,
                    goalsAgainst,
                    svPct,
                    Math.Round(xGA, 2),
                    Math.Round(xGA - goalsAgainst, 2),
                    false,
                    null
                );
            })
            .OrderByDescending(g => g.GameDate)
            .ToList();
    }

    public static void MarkBackToBackGames(List<GoalieGameStatsDto> gameStats)
    {
        for (int i = 0; i < gameStats.Count; i++)
        {
            if (i < gameStats.Count - 1)
            {
                var daysDiff = gameStats[i].GameDate.DayNumber - gameStats[i + 1].GameDate.DayNumber;
                gameStats[i] = gameStats[i] with
                {
                    IsBackToBack = daysDiff == 1,
                    DaysSincePreviousGame = daysDiff
                };
            }
        }
    }

    public static WorkloadWindowDto CalculateWindowStats(
        List<GoalieGameStatsDto> gameStats,
        DateOnly referenceDate,
        int days)
    {
        var cutoff = referenceDate.AddDays(-days);
        var windowGames = gameStats
            .Where(g => g.GameDate != DateOnly.MinValue && g.GameDate >= cutoff && g.GameDate <= referenceDate)
            .ToList();

        if (windowGames.Count == 0)
            return EmptyWorkloadWindow(days);

        var totalSA = windowGames.Sum(g => g.ShotsAgainst);
        var totalGA = windowGames.Sum(g => g.GoalsAgainst);
        var gamesPerWeek = Math.Round((decimal)windowGames.Count / days * 7, 2);
        var avgSA = Math.Round((decimal)totalSA / windowGames.Count, 1);
        var avgSvPct = totalSA > 0
            ? Math.Round((decimal)(totalSA - totalGA) / totalSA, 4)
            : 0;
        var totalGSAx = windowGames.Sum(g => g.GoalsSavedAboveExpected);

        var isHighWorkload = gamesPerWeek > 4 || avgSA > 30;

        return new WorkloadWindowDto(
            days, windowGames.Count, gamesPerWeek, totalSA,
            avgSA, avgSvPct, Math.Round(totalGSAx, 2), isHighWorkload);
    }

    public static BackToBackSplitsDto CalculateBackToBackSplits(List<GoalieGameStatsDto> gameStats)
    {
        var b2bGames = gameStats.Where(g => g.IsBackToBack).ToList();
        var nonB2bGames = gameStats.Where(g => !g.IsBackToBack).ToList();

        return new BackToBackSplitsDto(
            b2bGames.Count,
            nonB2bGames.Count,
            CalculateAvgSvPct(b2bGames),
            CalculateAvgSvPct(nonB2bGames),
            CalculateGAA(b2bGames),
            CalculateGAA(nonB2bGames),
            Math.Round(b2bGames.Sum(g => g.GoalsSavedAboveExpected), 2),
            Math.Round(nonB2bGames.Sum(g => g.GoalsSavedAboveExpected), 2)
        );
    }

    public static string DetermineWorkloadTrend(WorkloadWindowDto last7Days)
    {
        if (last7Days.GamesPerWeek >= 3 && last7Days.AvgShotsAgainstPerGame > 30) return "heavy";
        if (last7Days.GamesPerWeek >= 3) return "moderate";
        return "light";
    }

    public static WorkloadWindowDto EmptyWorkloadWindow(int days) =>
        new(days, 0, 0, 0, 0, 0, 0, false);

    public static BackToBackSplitsDto EmptyBackToBackSplits() =>
        new(0, 0, 0, 0, 0, 0, 0, 0);

    private static decimal CalculateAvgSvPct(List<GoalieGameStatsDto> gameStats)
    {
        if (gameStats.Count == 0) return 0;
        var totalSA = gameStats.Sum(g => g.ShotsAgainst);
        var totalGA = gameStats.Sum(g => g.GoalsAgainst);
        return totalSA > 0 ? Math.Round((decimal)(totalSA - totalGA) / totalSA, 4) : 0;
    }

    private static decimal CalculateGAA(List<GoalieGameStatsDto> gameStats)
    {
        if (gameStats.Count == 0) return 0;
        var totalGA = gameStats.Sum(g => g.GoalsAgainst);
        return Math.Round((decimal)totalGA / gameStats.Count, 2);
    }
}
