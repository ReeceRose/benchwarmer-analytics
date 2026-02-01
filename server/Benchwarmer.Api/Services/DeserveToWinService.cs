using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Services;

public interface IDeserveToWinService
{
    DeserveToWinResponseDto Calculate(
        string gameId,
        string homeTeamCode,
        string awayTeamCode,
        IReadOnlyList<Shot> shots,
        int homeGoals,
        int awayGoals);
}

public class DeserveToWinService : IDeserveToWinService
{
    private const int MonteCarloSimulations = 10_000;

    public DeserveToWinResponseDto Calculate(
        string gameId,
        string homeTeamCode,
        string awayTeamCode,
        IReadOnlyList<Shot> shots,
        int homeGoals,
        int awayGoals)
    {
        // Filter out empty net shots and sort by time
        var validShots = shots
            .Where(s => !s.ShotOnEmptyNet)
            .OrderBy(s => s.GameTimeSeconds)
            .ThenBy(s => s.EventId)
            .ToList();

        // Pre-extract shot data into arrays for cache-friendly MC simulation
        var shotData = ExtractShotData(validShots);

        var progression = new List<DeserveToWinPointDto>();
        decimal homeXgCumulative = 0;
        decimal awayXgCumulative = 0;

        for (int shotNumber = 1; shotNumber <= validShots.Count; shotNumber++)
        {
            var shot = validShots[shotNumber - 1];
            var shotXg = shot.XGoal ?? 0;
            var isHomeShot = shot.IsHomeTeam;

            if (isHomeShot)
                homeXgCumulative += shotXg;
            else
                awayXgCumulative += shotXg;

            var poissonWinPct = CalculatePoissonWinProbability(homeXgCumulative, awayXgCumulative);
            var monteCarloResult = RunMonteCarloSimulation(shotData, shotNumber);

            progression.Add(new DeserveToWinPointDto(
                ShotNumber: shotNumber,
                GameTimeSeconds: shot.GameTimeSeconds,
                Period: shot.Period,
                IsHomeShot: isHomeShot,
                ShotXG: shotXg,
                HomeXGCumulative: homeXgCumulative,
                AwayXGCumulative: awayXgCumulative,
                HomePoissonWinPct: poissonWinPct,
                HomeMonteCarloWinPct: monteCarloResult.HomeWinPct,
                WasGoal: shot.IsGoal ? true : null,
                IsRebound: shot.ShotRebound
            ));
        }

        // Calculate final summaries (use last progression point's MC result)
        var finalPoissonWinPct = CalculatePoissonWinProbability(homeXgCumulative, awayXgCumulative);
        var finalMonteCarloResult = RunMonteCarloSimulation(shotData, validShots.Count);

        var homeSummary = new DeserveToWinSummaryDto(
            TotalXG: homeXgCumulative,
            PoissonWinPct: finalPoissonWinPct,
            MonteCarloWinPct: finalMonteCarloResult.HomeWinPct,
            MonteCarloOTWinPct: finalMonteCarloResult.HomeOTWinPct,
            ShotsExcludingEmptyNet: validShots.Count(s => s.IsHomeTeam)
        );

        var awaySummary = new DeserveToWinSummaryDto(
            TotalXG: awayXgCumulative,
            PoissonWinPct: 1 - finalPoissonWinPct,
            MonteCarloWinPct: 1 - finalMonteCarloResult.HomeWinPct,
            MonteCarloOTWinPct: finalMonteCarloResult.AwayOTWinPct,
            ShotsExcludingEmptyNet: validShots.Count(s => !s.IsHomeTeam)
        );

        return new DeserveToWinResponseDto(
            GameId: gameId,
            HomeTeamCode: homeTeamCode,
            AwayTeamCode: awayTeamCode,
            HomeGoals: homeGoals,
            AwayGoals: awayGoals,
            HomeSummary: homeSummary,
            AwaySummary: awaySummary,
            Progression: progression
        );
    }

    /// <summary>
    /// Pre-extract shot properties into arrays for cache-friendly iteration in MC simulation.
    /// </summary>
    private static ShotDataArrays ExtractShotData(List<Shot> shots)
    {
        var count = shots.Count;
        var xGoals = new double[count];
        var isHome = new bool[count];
        var isRebound = new bool[count];
        var generatesRebound = new bool[count];

        for (int i = 0; i < count; i++)
        {
            xGoals[i] = (double)(shots[i].XGoal ?? 0);
            isHome[i] = shots[i].IsHomeTeam;
            isRebound[i] = shots[i].ShotRebound;
            generatesRebound[i] = shots[i].ShotGeneratedRebound;
        }

        return new ShotDataArrays(xGoals, isHome, isRebound, generatesRebound);
    }

    /// <summary>
    /// Calculate win probability using Poisson distribution.
    /// Models goals as Poisson-distributed random variables.
    /// </summary>
    private static decimal CalculatePoissonWinProbability(decimal homeXg, decimal awayXg)
    {
        if (homeXg == 0 && awayXg == 0)
            return 0.5m;

        double homeXgD = (double)homeXg;
        double awayXgD = (double)awayXg;

        double homeRegWinProb = 0;
        double tieProb = 0;

        // Sum over reasonable goal counts (0-15 covers >99.99% of outcomes)
        const int maxGoals = 15;

        for (int h = 0; h <= maxGoals; h++)
        {
            double homeProb = PoissonPmf(h, homeXgD);
            for (int a = 0; a <= maxGoals; a++)
            {
                double awayProb = PoissonPmf(a, awayXgD);
                double jointProb = homeProb * awayProb;

                if (h > a)
                    homeRegWinProb += jointProb;
                else if (h == a)
                    tieProb += jointProb;
            }
        }

        // OT is 50/50
        double homeOTWinProb = tieProb * 0.5;
        double totalHomeWinProb = homeRegWinProb + homeOTWinProb;

        return (decimal)Math.Min(1.0, Math.Max(0.0, totalHomeWinProb));
    }

    /// <summary>
    /// Poisson probability mass function: P(X = k) = (λ^k * e^-λ) / k!
    /// </summary>
    private static double PoissonPmf(int k, double lambda)
    {
        if (lambda <= 0)
            return k == 0 ? 1.0 : 0.0;

        // Use log space for numerical stability
        double logProb = k * Math.Log(lambda) - lambda - LogFactorial(k);
        return Math.Exp(logProb);
    }

    private static double LogFactorial(int n)
    {
        if (n <= 1) return 0;
        double result = 0;
        for (int i = 2; i <= n; i++)
            result += Math.Log(i);
        return result;
    }

    /// <summary>
    /// Run Monte Carlo simulation to estimate win probability.
    /// Uses parallel execution and pre-extracted arrays for performance.
    /// Handles shot flurries by skipping rebounds after a goal.
    /// </summary>
    private static MonteCarloResult RunMonteCarloSimulation(ShotDataArrays shotData, int shotCount)
    {
        if (shotCount == 0)
            return new MonteCarloResult(0.5m, 0.25m, 0.25m);

        int homeWins = 0;
        int awayWins = 0;
        int ties = 0;

        Parallel.For(0, MonteCarloSimulations,
            // Thread-local state: counters only (Random.Shared is already thread-safe with per-thread optimization)
            () => (hw: 0, aw: 0, t: 0),
            (sim, loopState, local) =>
            {
                int homeScore = 0;
                int awayScore = 0;
                bool skipUntilNonRebound = false;

                for (int i = 0; i < shotCount; i++)
                {
                    // Skip rebound shots after a simulated goal (flurry handling)
                    if (skipUntilNonRebound && shotData.IsRebound[i])
                        continue;

                    skipUntilNonRebound = false;

                    if (Random.Shared.NextDouble() < shotData.XGoals[i])
                    {
                        // Goal scored in this simulation
                        if (shotData.IsHome[i])
                            homeScore++;
                        else
                            awayScore++;

                        // If this shot generated a rebound, skip subsequent rebounds
                        if (shotData.GeneratesRebound[i])
                            skipUntilNonRebound = true;
                    }
                }

                if (homeScore > awayScore)
                    local.hw++;
                else if (awayScore > homeScore)
                    local.aw++;
                else
                    local.t++;

                return local;
            },
            local =>
            {
                Interlocked.Add(ref homeWins, local.hw);
                Interlocked.Add(ref awayWins, local.aw);
                Interlocked.Add(ref ties, local.t);
            });

        // Handle OT: 50/50 split of ties
        int homeOTWins = ties / 2;
        int awayOTWins = ties - homeOTWins;

        decimal totalHomeWins = homeWins + homeOTWins;
        decimal homeWinPct = totalHomeWins / MonteCarloSimulations;
        decimal homeOTWinPct = (decimal)homeOTWins / MonteCarloSimulations;
        decimal awayOTWinPct = (decimal)awayOTWins / MonteCarloSimulations;

        return new MonteCarloResult(homeWinPct, homeOTWinPct, awayOTWinPct);
    }

    private record ShotDataArrays(double[] XGoals, bool[] IsHome, bool[] IsRebound, bool[] GeneratesRebound);
    private record MonteCarloResult(decimal HomeWinPct, decimal HomeOTWinPct, decimal AwayOTWinPct);
}
