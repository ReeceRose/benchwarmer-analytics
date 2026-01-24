using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for standings and power ranking calculations.
/// </summary>
public static class StandingsMappers
{
    /// <summary>
    /// Build a power ranking DTO from team season stats.
    /// </summary>
    public static TeamPowerRankingDto BuildPowerRanking(
        TeamSeason ts,
        decimal? ppPct = null,
        decimal? pkPct = null)
    {
        var gamesPlayed = ts.GamesPlayed;
        var goalsFor = ts.GoalsFor;
        var goalsAgainst = ts.GoalsAgainst;

        // Estimate wins/losses using Pythagorean expectation on actual goals
        var gf = (decimal)goalsFor;
        var ga = (decimal)goalsAgainst;
        var winPct = gf > 0 || ga > 0
            ? (gf * gf) / ((gf * gf) + (ga * ga))
            : 0.5m;

        // Estimate OTL as ~10% of losses (league average is roughly 10-12%)
        var estimatedWins = (int)Math.Round((double)winPct * gamesPlayed);
        var estimatedLosses = gamesPlayed - estimatedWins;
        var otLosses = (int)Math.Round(estimatedLosses * 0.10);
        var regLosses = estimatedLosses - otLosses;
        var points = (estimatedWins * 2) + otLosses;

        // Calculate PDO components
        var shotsFor = ts.ShotsOnGoalFor > 0 ? ts.ShotsOnGoalFor : 1;
        var shotsAgainst = ts.ShotsOnGoalAgainst > 0 ? ts.ShotsOnGoalAgainst : 1;
        var shootingPct = (decimal)goalsFor / shotsFor * 100;
        var savePct = (decimal)(shotsAgainst - goalsAgainst) / shotsAgainst * 100;
        var pdo = shootingPct + savePct;

        // Calculate expected points based on xG differential
        var xGf = ts.XGoalsFor;
        var xGa = ts.XGoalsAgainst;
        var xWinPct = xGf > 0 || xGa > 0
            ? (xGf * xGf) / ((xGf * xGf) + (xGa * xGa))
            : 0.5m;
        var expectedPoints = gamesPlayed > 0
            ? (int)Math.Round((double)xWinPct * gamesPlayed * 2)
            : 0;

        return new TeamPowerRankingDto(
            ts.TeamAbbreviation,
            ts.Team?.Name ?? ts.TeamAbbreviation,
            ts.Team?.Division,
            ts.Team?.Conference,
            gamesPlayed,
            estimatedWins,
            regLosses,
            otLosses,
            points,
            goalsFor,
            goalsAgainst,
            ts.XGoalsFor,
            ts.XGoalsAgainst,
            ts.XGoalsPercentage,
            ts.CorsiPercentage,
            ts.FenwickPercentage,
            pdo,
            shootingPct,
            savePct,
            ppPct,
            pkPct,
            expectedPoints,
            points - expectedPoints,
            0, // Will be set after sorting
            0  // Will be set after sorting
        );
    }

    /// <summary>
    /// Identify teams likely to improve based on analytics vs standings gap.
    /// </summary>
    public static List<RegressionCandidateDto> FindLikelyToImprove(
        List<TeamPowerRankingDto> rankings,
        int maxCount = 4)
    {
        return rankings
            .Where(r => r.PointsRank - r.XGoalsPctRank >= 8 && r.Pdo < 99)
            .OrderByDescending(r => r.PointsRank - r.XGoalsPctRank)
            .Take(maxCount)
            .Select(r => new RegressionCandidateDto(
                r.Abbreviation,
                r.Name,
                r.PointsRank,
                r.XGoalsPctRank,
                r.Pdo,
                $"{Ordinal(r.XGoalsPctRank)} in xG%, {Ordinal(r.PointsRank)} in points (PDO: {r.Pdo:F1})"
            ))
            .ToList();
    }

    /// <summary>
    /// Identify teams likely to regress based on analytics vs standings gap.
    /// </summary>
    public static List<RegressionCandidateDto> FindLikelyToRegress(
        List<TeamPowerRankingDto> rankings,
        int maxCount = 4)
    {
        return rankings
            .Where(r => r.XGoalsPctRank - r.PointsRank >= 8 && r.Pdo > 101)
            .OrderByDescending(r => r.XGoalsPctRank - r.PointsRank)
            .Take(maxCount)
            .Select(r => new RegressionCandidateDto(
                r.Abbreviation,
                r.Name,
                r.PointsRank,
                r.XGoalsPctRank,
                r.Pdo,
                $"{Ordinal(r.XGoalsPctRank)} in xG%, {Ordinal(r.PointsRank)} in points (PDO: {r.Pdo:F1})"
            ))
            .ToList();
    }

    /// <summary>
    /// Convert a number to its ordinal string (1st, 2nd, 3rd, etc.).
    /// </summary>
    public static string Ordinal(int number)
    {
        if (number <= 0) return number.ToString();

        var suffix = (number % 100) switch
        {
            11 or 12 or 13 => "th",
            _ => (number % 10) switch
            {
                1 => "st",
                2 => "nd",
                3 => "rd",
                _ => "th"
            }
        };

        return $"{number}{suffix}";
    }
}
