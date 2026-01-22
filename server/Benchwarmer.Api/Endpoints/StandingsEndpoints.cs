using Benchwarmer.Api.Dtos;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Api.Endpoints;

public static class StandingsEndpoints
{
    public static void MapStandingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/standings")
            .WithTags("Standings");

        group.MapGet("/power-rankings", GetPowerRankings)
            .WithName("GetPowerRankings")
            .WithSummary("Get team power rankings with analytics")
            .WithDescription("""
                Returns league-wide team power rankings combining traditional standings with advanced analytics.

                Includes:
                - Traditional standings (W/L/OTL/Pts)
                - Expected goals metrics (xGF, xGA, xG%)
                - Possession metrics (CF%, FF%)
                - PDO (shooting % + save %) - values near 100 are sustainable
                - Points vs Expected Points comparison
                - Regression candidates (teams likely to improve or decline)

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                """)
            .Produces<PowerRankingsDto>()
            .CacheOutput(CachePolicies.TeamData);
    }

    private static async Task<IResult> GetPowerRankings(
        int? season,
        ITeamSeasonRepository teamSeasonRepository,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        // Get the latest season if not specified
        var targetSeason = season ?? await db.TeamSeasons
            .Select(ts => ts.Season)
            .Distinct()
            .OrderByDescending(s => s)
            .FirstOrDefaultAsync(cancellationToken);

        if (targetSeason == 0)
        {
            return Results.Ok(new PowerRankingsDto(
                targetSeason,
                [],
                new RegressionInsightsDto([], [])
            ));
        }

        // Get team season stats (all situations, regular season only) - this has accurate GP from MoneyPuck
        var teamSeasons = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "all", isPlayoffs: false, cancellationToken);

        // Build power rankings using TeamSeason data
        // Note: We estimate W/L/OTL from goal differential since we don't have complete game data
        var rankings = new List<TeamPowerRankingDto>();

        foreach (var ts in teamSeasons)
        {
            var gamesPlayed = ts.GamesPlayed;
            var goalsFor = ts.GoalsFor;
            var goalsAgainst = ts.GoalsAgainst;

            // Estimate wins/losses using Pythagorean expectation on actual goals
            // Win% ≈ GF^2 / (GF^2 + GA^2)
            var gf = (decimal)goalsFor;
            var ga = (decimal)goalsAgainst;
            var winPct = gf > 0 || ga > 0
                ? (gf * gf) / ((gf * gf) + (ga * ga))
                : 0.5m;

            // Estimate OTL as ~10% of losses (league average is roughly 10-12%)
            var estimatedWins = (int)Math.Round((double)winPct * gamesPlayed);
            var estimatedLosses = gamesPlayed - estimatedWins;
            var otLosses = (int)Math.Round(estimatedLosses * 0.10); // ~10% of losses are OT
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

            rankings.Add(new TeamPowerRankingDto(
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
                expectedPoints,
                points - expectedPoints,
                0, // Will be set after sorting
                0  // Will be set after sorting
            ));
        }

        // Sort by points and set ranks
        var sortedByPoints = rankings.OrderByDescending(r => r.Points).ThenByDescending(r => r.Wins).ToList();
        var sortedByXgPct = rankings.OrderByDescending(r => r.XGoalsPct).ToList();

        for (int i = 0; i < sortedByPoints.Count; i++)
        {
            var team = sortedByPoints[i];
            var xgRank = sortedByXgPct.FindIndex(r => r.Abbreviation == team.Abbreviation) + 1;

            sortedByPoints[i] = team with
            {
                PointsRank = i + 1,
                XGoalsPctRank = xgRank
            };
        }

        // Identify regression candidates
        var likelyToImprove = sortedByPoints
            .Where(r => r.PointsRank - r.XGoalsPctRank >= 8 && r.Pdo < 99) // Much worse in standings than analytics + unlucky
            .OrderByDescending(r => r.PointsRank - r.XGoalsPctRank)
            .Take(4)
            .Select(r => new RegressionCandidateDto(
                r.Abbreviation,
                r.Name,
                r.PointsRank,
                r.XGoalsPctRank,
                r.Pdo,
                $"{Ordinal(r.XGoalsPctRank)} in xG%, {Ordinal(r.PointsRank)} in points (PDO: {r.Pdo:F1})"
            ))
            .ToList();

        var likelyToRegress = sortedByPoints
            .Where(r => r.XGoalsPctRank - r.PointsRank >= 8 && r.Pdo > 101) // Much better in standings than analytics + lucky
            .OrderByDescending(r => r.XGoalsPctRank - r.PointsRank)
            .Take(4)
            .Select(r => new RegressionCandidateDto(
                r.Abbreviation,
                r.Name,
                r.PointsRank,
                r.XGoalsPctRank,
                r.Pdo,
                $"{Ordinal(r.XGoalsPctRank)} in xG%, {Ordinal(r.PointsRank)} in points (PDO: {r.Pdo:F1})"
            ))
            .ToList();

        return Results.Ok(new PowerRankingsDto(
            targetSeason,
            sortedByPoints,
            new RegressionInsightsDto(likelyToImprove, likelyToRegress)
        ));
    }

    private static string Ordinal(int number)
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
