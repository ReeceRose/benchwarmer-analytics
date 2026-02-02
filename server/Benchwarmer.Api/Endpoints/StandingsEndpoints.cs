using Benchwarmer.Api.Dtos;
using Benchwarmer.Api.Endpoints.Helpers;
using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Services;
using Microsoft.AspNetCore.Mvc;
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

        group.MapGet("/", GetOfficialStandings)
            .WithName("GetOfficialStandings")
            .WithSummary("Get official NHL standings")
            .WithDescription("""
                Returns official NHL standings from the NHL API.

                Includes:
                - Core standings (W/L/OTL/Pts)
                - Goal differential
                - Home and away records
                - Last 10 games record
                - Current streak
                - Division, conference, and league rankings

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                """)
            .Produces<OfficialStandingsResponse>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/analytics", GetStandingsAnalytics)
            .WithName("GetStandingsAnalytics")
            .WithSummary("Get team analytics for standings overlay")
            .WithDescription("""
                Returns MoneyPuck analytics data for all teams to overlay on standings.

                Includes:
                - Expected goals (xGF, xGA, xG%)
                - Possession metrics (CF%, FF%)
                - PDO and its components (Sh%, Sv%)
                - Expected points vs actual comparison

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                """)
            .Produces<StandingsAnalyticsResponse>()
            .CacheOutput(CachePolicies.TeamData);

        group.MapGet("/category-rankings", GetCategoryRankings)
            .WithName("GetCategoryRankings")
            .WithSummary("Get team category rankings (1-32) across multiple stats")
            .WithDescription("""
                Returns each team's rank (1-32) across multiple statistical categories.

                Categories include:
                - Points, Goals For, Goals Against, Goal Differential
                - xG%, Corsi%
                - PP%, PK%
                - High Danger Chances For/Against

                **Query Parameters:**
                - `season`: Season year (e.g., 2024 for 2024-25 season). Defaults to current season.
                - `team`: Optional team abbreviation (e.g., "TOR") to filter to a single team.
                """)
            .Produces<CategoryRankingsResponse>()
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

        // Get special teams data for PP% and PK%
        var ppStats = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "5on4", isPlayoffs: false, cancellationToken);
        var pkStats = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "4on5", isPlayoffs: false, cancellationToken);

        var ppByTeam = ppStats.ToDictionary(s => s.TeamAbbreviation, TeamMappers.CalculatePPPercentage);
        var pkByTeam = pkStats.ToDictionary(s => s.TeamAbbreviation, TeamMappers.CalculatePKPercentage);

        // Build power rankings using TeamSeason data with special teams
        var rankings = teamSeasons.Select(ts => StandingsMappers.BuildPowerRanking(
            ts,
            ppByTeam.GetValueOrDefault(ts.TeamAbbreviation),
            pkByTeam.GetValueOrDefault(ts.TeamAbbreviation)
        )).ToList();

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
        var likelyToImprove = StandingsMappers.FindLikelyToImprove(sortedByPoints);
        var likelyToRegress = StandingsMappers.FindLikelyToRegress(sortedByPoints);

        return Results.Ok(new PowerRankingsDto(
            targetSeason,
            sortedByPoints,
            new RegressionInsightsDto(likelyToImprove, likelyToRegress)
        ));
    }

    private static async Task<IResult> GetOfficialStandings(
        NhlScheduleService nhlScheduleService,
        CancellationToken cancellationToken)
    {
        var standings = await nhlScheduleService.GetStandingsAsync(cancellationToken);

        if (standings.Count == 0)
        {
            return Results.Ok(new OfficialStandingsResponse(null, []));
        }

        var teams = standings.Values
            .OrderByDescending(s => s.Points)
            .ThenByDescending(s => s.Wins)
            .ThenBy(s => s.GamesPlayed)
            .Select(s => new OfficialStandingsDto(
                s.TeamAbbrev?.Default ?? "",
                s.TeamName?.Default ?? "",
                s.DivisionName,
                s.ConferenceName,
                s.GamesPlayed,
                s.Wins,
                s.Losses,
                s.OtLosses,
                s.Points,
                s.PointPctg,
                s.GoalFor,
                s.GoalAgainst,
                s.GoalDifferential,
                FormatRecord(s.HomeWins, s.HomeLosses, s.HomeOtLosses),
                FormatRecord(s.RoadWins, s.RoadLosses, s.RoadOtLosses),
                FormatRecord(s.L10Wins, s.L10Losses, s.L10OtLosses),
                FormatStreak(s.StreakCode, s.StreakCount),
                s.DivisionSequence,
                s.ConferenceSequence,
                0, // League rank will be set below
                CalculateWildcardRank(s)
            ))
            .ToList();

        // Set league rank based on position in sorted list
        for (int i = 0; i < teams.Count; i++)
        {
            teams[i] = teams[i] with { LeagueRank = i + 1 };
        }

        return Results.Ok(new OfficialStandingsResponse(null, teams));
    }

    private static async Task<IResult> GetStandingsAnalytics(
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
            return Results.Ok(new StandingsAnalyticsResponse(targetSeason, []));
        }

        var teamSeasons = await teamSeasonRepository.GetBySeasonAsync(
            targetSeason, "all", isPlayoffs: false, cancellationToken);

        var analytics = teamSeasons.Select(ts =>
        {
            // Calculate PDO components
            var shotsFor = ts.ShotsOnGoalFor > 0 ? ts.ShotsOnGoalFor : 1;
            var shotsAgainst = ts.ShotsOnGoalAgainst > 0 ? ts.ShotsOnGoalAgainst : 1;
            var goalsFor = ts.GoalsFor;
            var goalsAgainst = ts.GoalsAgainst;
            var shootingPct = (decimal)goalsFor / shotsFor * 100;
            var savePct = (decimal)(shotsAgainst - goalsAgainst) / shotsAgainst * 100;
            var pdo = shootingPct + savePct;

            // Calculate expected points based on xG differential (Pythagorean expectation)
            var xGf = ts.XGoalsFor;
            var xGa = ts.XGoalsAgainst;
            var xWinPct = xGf > 0 || xGa > 0
                ? (xGf * xGf) / ((xGf * xGf) + (xGa * xGa))
                : 0.5m;
            var gamesPlayed = ts.GamesPlayed;
            var expectedPoints = gamesPlayed > 0
                ? (int)Math.Round((double)xWinPct * gamesPlayed * 2)
                : 0;

            // Estimate actual points for comparison
            var gf = (decimal)goalsFor;
            var ga = (decimal)goalsAgainst;
            var winPct = gf > 0 || ga > 0
                ? (gf * gf) / ((gf * gf) + (ga * ga))
                : 0.5m;
            var estimatedWins = (int)Math.Round((double)winPct * gamesPlayed);
            var estimatedLosses = gamesPlayed - estimatedWins;
            var otLosses = (int)Math.Round(estimatedLosses * 0.10);
            var actualPoints = (estimatedWins * 2) + otLosses;

            return new StandingsAnalyticsDto(
                ts.TeamAbbreviation,
                ts.XGoalsFor,
                ts.XGoalsAgainst,
                ts.XGoalsPercentage,
                ts.CorsiPercentage,
                ts.FenwickPercentage,
                pdo,
                shootingPct,
                savePct,
                expectedPoints,
                actualPoints - expectedPoints
            );
        }).ToList();

        return Results.Ok(new StandingsAnalyticsResponse(targetSeason, analytics));
    }

    private static string FormatRecord(int wins, int losses, int otLosses)
    {
        return $"{wins}-{losses}-{otLosses}";
    }

    private static string? FormatStreak(string? code, int count)
    {
        if (string.IsNullOrEmpty(code) || count == 0)
            return null;
        return $"{code}{count}";
    }

    private static int CalculateWildcardRank(NhlTeamStandings standings)
    {
        // Division top 3 are not in wildcard
        if (standings.DivisionSequence <= 3)
            return 0;

        // Wildcard position is conference rank minus top 6 (3 from each division)
        var wildcardPosition = standings.ConferenceSequence - 6;
        return wildcardPosition > 0 ? wildcardPosition : 0;
    }

    private static async Task<IResult> GetCategoryRankings(
        [FromQuery] int? season,
        [FromQuery] string? team,
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
            return Results.Ok(new CategoryRankingsResponse(targetSeason, []));
        }

        // Fetch MoneyPuck "all" situation data (has GF, GA, xG%, Corsi%, HD chances)
        var teamSeasons = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "all", isPlayoffs: false, cancellationToken);

        if (teamSeasons.Count == 0)
        {
            return Results.Ok(new CategoryRankingsResponse(targetSeason, []));
        }

        // Fetch special teams data
        var ppStats = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "5on4", isPlayoffs: false, cancellationToken);
        var pkStats = await teamSeasonRepository.GetBySeasonAsync(targetSeason, "4on5", isPlayoffs: false, cancellationToken);

        var ppByTeam = ppStats.ToDictionary(s => s.TeamAbbreviation, TeamMappers.CalculatePPPercentage);
        var pkByTeam = pkStats.ToDictionary(s => s.TeamAbbreviation, TeamMappers.CalculatePKPercentage);

        // Build raw data using MoneyPuck TeamSeason as the base
        var teamData = teamSeasons.Select(ts =>
        {
            var abbrev = ts.TeamAbbreviation;
            var teamName = ts.Team?.Name ?? abbrev;

            // Calculate shooting percentage: goals / shots on goal * 100
            decimal? shootingPct = ts.ShotsOnGoalFor > 0
                ? (decimal)ts.GoalsFor / ts.ShotsOnGoalFor * 100
                : null;

            // Calculate save percentage: (shots against - goals against) / shots against * 100
            decimal? savePct = ts.ShotsOnGoalAgainst > 0
                ? (decimal)(ts.ShotsOnGoalAgainst - ts.GoalsAgainst) / ts.ShotsOnGoalAgainst * 100
                : null;

            // Calculate faceoff percentage
            var totalFaceoffs = ts.FaceOffsWonFor + ts.FaceOffsWonAgainst;
            decimal? faceoffPct = totalFaceoffs > 0
                ? (decimal)ts.FaceOffsWonFor / totalFaceoffs * 100
                : null;

            return new
            {
                Abbreviation = abbrev,
                Name = teamName,
                GoalsFor = ts.GoalsFor,
                GoalsAgainst = ts.GoalsAgainst,
                GoalDifferential = ts.GoalsFor - ts.GoalsAgainst,
                XGoalsFor = ts.XGoalsFor,
                XGoalsAgainst = ts.XGoalsAgainst,
                XGoalsPct = ts.XGoalsPercentage,
                CorsiPct = ts.CorsiPercentage,
                FenwickPct = ts.FenwickPercentage,
                PpPct = ppByTeam.GetValueOrDefault(abbrev),
                PkPct = pkByTeam.GetValueOrDefault(abbrev),
                HighDangerChancesFor = ts.HighDangerShotsFor,
                HighDangerChancesAgainst = ts.HighDangerShotsAgainst,
                ShootingPct = shootingPct,
                SavePct = savePct,
                FaceoffPct = faceoffPct,
                PenaltiesDrawn = ts.PenaltiesAgainst,
                PenaltiesTaken = ts.PenaltiesFor,
                PenaltyDifferential = ts.PenaltiesAgainst - ts.PenaltiesFor,
                Hits = ts.HitsFor,
                HitsAgainst = ts.HitsAgainst,
                Takeaways = ts.TakeawaysFor,
                Giveaways = ts.GiveawaysFor,
                BlockedShots = ts.BlockedShotAttemptsFor
            };
        }).ToList();

        // Calculate ranks for each category
        var goalsForRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.GoalsFor, descending: true);
        var goalsAgainstRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.GoalsAgainst, descending: false);
        var goalDiffRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.GoalDifferential, descending: true);
        var xgForRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.XGoalsFor, descending: true);
        var xgAgainstRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.XGoalsAgainst, descending: false);
        var xgPctRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.XGoalsPct ?? 0, descending: true);
        var corsiRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.CorsiPct ?? 0, descending: true);
        var fenwickRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.FenwickPct ?? 0, descending: true);
        var ppRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.PpPct, descending: true);
        var pkRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.PkPct, descending: true);
        var hdForRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.HighDangerChancesFor, descending: true);
        var hdAgainstRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.HighDangerChancesAgainst, descending: false);
        var shootingPctRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.ShootingPct ?? 0, descending: true);
        var savePctRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.SavePct ?? 0, descending: true);
        var faceoffRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.FaceoffPct ?? 0, descending: true);
        var penDrawnRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.PenaltiesDrawn, descending: true);
        var penTakenRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.PenaltiesTaken, descending: false);
        var penDiffRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.PenaltyDifferential, descending: true);
        var hitsRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.Hits, descending: true);
        var hitsAgainstRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.HitsAgainst, descending: false);
        var takeawaysRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.Takeaways, descending: true);
        var giveawaysRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.Giveaways, descending: false);
        var blockedShotsRanks = CalculateRanks(teamData, t => t.Abbreviation, t => t.BlockedShots, descending: true);

        // Calculate weighted overall score (lower is better)
        // Weights: High (3x) = xG%, Goal Diff; Medium (2x) = CF%, FF%, PP%, PK%, Sv%, HD; Standard (1x) = everything else
        var overallScores = teamData.ToDictionary(
            t => t.Abbreviation,
            t =>
            {
                var abbrev = t.Abbreviation;
                // High weight (3x)
                var highWeight = (xgPctRanks[abbrev] + goalDiffRanks[abbrev]) * 3m;
                // Medium weight (2x)
                var mediumWeight = (corsiRanks[abbrev] + fenwickRanks[abbrev] + ppRanks[abbrev] +
                                   pkRanks[abbrev] + savePctRanks[abbrev] + hdForRanks[abbrev] +
                                   hdAgainstRanks[abbrev]) * 2m;
                // Standard weight (1x)
                var standardWeight = goalsForRanks[abbrev] + goalsAgainstRanks[abbrev] +
                                    xgForRanks[abbrev] + xgAgainstRanks[abbrev] +
                                    shootingPctRanks[abbrev] + faceoffRanks[abbrev] +
                                    penDrawnRanks[abbrev] + penTakenRanks[abbrev] + penDiffRanks[abbrev] +
                                    hitsRanks[abbrev] + hitsAgainstRanks[abbrev] +
                                    takeawaysRanks[abbrev] + giveawaysRanks[abbrev] + blockedShotsRanks[abbrev];

                var totalWeight = (2 * 3m) + (7 * 2m) + 14m; // 6 + 14 + 14 = 34
                return (highWeight + mediumWeight + standardWeight) / totalWeight;
            });

        // Rank by overall score (lower score = better rank)
        var overallRanks = overallScores
            .OrderBy(kvp => kvp.Value)
            .Select((kvp, index) => (kvp.Key, Rank: index + 1))
            .ToDictionary(x => x.Key, x => x.Rank);

        // Build final DTOs
        var results = teamData.Select(t => new TeamCategoryRanksDto(
            t.Abbreviation,
            t.Name,
            t.GoalsFor,
            t.GoalsAgainst,
            t.GoalDifferential,
            t.XGoalsFor,
            t.XGoalsAgainst,
            t.XGoalsPct,
            t.CorsiPct,
            t.FenwickPct,
            t.PpPct,
            t.PkPct,
            t.HighDangerChancesFor,
            t.HighDangerChancesAgainst,
            t.ShootingPct,
            t.SavePct,
            t.FaceoffPct,
            t.PenaltiesDrawn,
            t.PenaltiesTaken,
            t.PenaltyDifferential,
            t.Hits,
            t.HitsAgainst,
            t.Takeaways,
            t.Giveaways,
            t.BlockedShots,
            overallRanks[t.Abbreviation],
            Math.Round(overallScores[t.Abbreviation], 2),
            goalsForRanks[t.Abbreviation],
            goalsAgainstRanks[t.Abbreviation],
            goalDiffRanks[t.Abbreviation],
            xgForRanks[t.Abbreviation],
            xgAgainstRanks[t.Abbreviation],
            xgPctRanks[t.Abbreviation],
            corsiRanks[t.Abbreviation],
            fenwickRanks[t.Abbreviation],
            ppRanks[t.Abbreviation],
            pkRanks[t.Abbreviation],
            hdForRanks[t.Abbreviation],
            hdAgainstRanks[t.Abbreviation],
            shootingPctRanks[t.Abbreviation],
            savePctRanks[t.Abbreviation],
            faceoffRanks[t.Abbreviation],
            penDrawnRanks[t.Abbreviation],
            penTakenRanks[t.Abbreviation],
            penDiffRanks[t.Abbreviation],
            hitsRanks[t.Abbreviation],
            hitsAgainstRanks[t.Abbreviation],
            takeawaysRanks[t.Abbreviation],
            giveawaysRanks[t.Abbreviation],
            blockedShotsRanks[t.Abbreviation]
        )).OrderBy(t => t.OverallRank).ToList();

        // Filter to single team if requested
        if (!string.IsNullOrEmpty(team))
        {
            results = results.Where(t => t.Abbreviation.Equals(team, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Results.Ok(new CategoryRankingsResponse(targetSeason, results));
    }

    private static Dictionary<string, int> CalculateRanks<T, TKey>(
        IReadOnlyList<T> items,
        Func<T, string> abbreviationSelector,
        Func<T, TKey> keySelector,
        bool descending)
    {
        var sorted = descending
            ? items.OrderByDescending(keySelector).ToList()
            : items.OrderBy(keySelector).ToList();

        var ranks = new Dictionary<string, int>();
        for (int i = 0; i < sorted.Count; i++)
        {
            var abbrev = abbreviationSelector(sorted[i]);
            ranks[abbrev] = i + 1;
        }
        return ranks;
    }
}
