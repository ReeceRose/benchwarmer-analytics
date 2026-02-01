using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class ScoreStateTimeCalculator(AppDbContext db, ILogger<ScoreStateTimeCalculator> logger)
{
    private readonly AppDbContext _db = db;
    private readonly ILogger<ScoreStateTimeCalculator> _logger = logger;

    // Standard period length in seconds
    private const int RegulationPeriodSeconds = 20 * 60; // 20 minutes
    private const int OvertimePeriodSeconds = 5 * 60;    // 5 minutes regular season
    private const int PlayoffOvertimeSeconds = 20 * 60;  // 20 minutes playoffs

    public async Task CalculateForSeasonAsync(int season, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Calculating score state times for season {Season}", season);

        // Get all goals for the season, grouped by game
        var goals = await _db.Shots
            .Where(s => s.Season == season && s.IsGoal)
            .Select(s => new GoalEvent
            {
                GameId = s.GameId,
                TeamCode = s.TeamCode,
                HomeTeamCode = s.HomeTeamCode,
                AwayTeamCode = s.AwayTeamCode,
                Period = s.Period,
                Time = s.GameTimeSeconds,
                IsPlayoffs = s.IsPlayoffGame,
                HomeTeamGoals = s.HomeTeamGoals,
                AwayTeamGoals = s.AwayTeamGoals,
                WentToOT = s.WentToOT,
                WentToShootout = s.WentToShootout
            })
            .ToListAsync(cancellationToken);

        // Get game metadata from Games table if available (for recent games)
        var games = await _db.Games
            .Where(g => g.Season == season && g.GameState == GameState.Final)
            .ToDictionaryAsync(g => g.GameId, cancellationToken);

        // Also get game info from shots for games not in Games table
        var gameInfoFromShots = await _db.Shots
            .Where(s => s.Season == season)
            .GroupBy(s => s.GameId)
            .Select(g => new
            {
                GameId = g.Key,
                HomeTeamCode = g.First().HomeTeamCode,
                AwayTeamCode = g.First().AwayTeamCode,
                IsPlayoffs = g.First().IsPlayoffGame,
                MaxPeriod = g.Max(s => s.Period),
                WentToOT = g.Any(s => s.WentToOT == true),
                WentToShootout = g.Any(s => s.WentToShootout == true)
            })
            .ToDictionaryAsync(g => g.GameId, cancellationToken);

        var goalsByGame = goals.GroupBy(g => g.GameId).ToDictionary(g => g.Key, g => g.ToList());

        // Get all unique game IDs from both goals and shots (to handle 0-0 games)
        var allGameIds = gameInfoFromShots.Keys
            .Union(games.Keys)
            .Distinct()
            .ToList();

        var results = new List<GameScoreStateTime>();
        var processedGames = 0;

        foreach (var gameId in allGameIds)
        {
            // Get goals for this game (may be empty for 0-0 games)
            var gameGoals = goalsByGame.GetValueOrDefault(gameId) ?? [];

            // Try to get game info from Games table first, fall back to shot-derived info
            string homeTeam, awayTeam;
            bool isPlayoffs;
            int finalPeriod;

            if (games.TryGetValue(gameId, out var game))
            {
                homeTeam = game.HomeTeamCode;
                awayTeam = game.AwayTeamCode;
                isPlayoffs = game.GameType == 3;
                finalPeriod = DetermineFinalPeriodFromGame(game);
            }
            else if (gameInfoFromShots.TryGetValue(gameId, out var shotInfo))
            {
                homeTeam = shotInfo.HomeTeamCode;
                awayTeam = shotInfo.AwayTeamCode;
                isPlayoffs = shotInfo.IsPlayoffs;
                finalPeriod = DetermineFinalPeriodFromShots(shotInfo.MaxPeriod, shotInfo.WentToOT, shotInfo.WentToShootout);
            }
            else
            {
                continue;
            }

            // Calculate for both teams
            var (homeResult, awayResult) = CalculateGameScoreStateTimes(
                gameId, season, homeTeam, awayTeam, gameGoals, isPlayoffs, finalPeriod);

            results.Add(homeResult);
            results.Add(awayResult);
            processedGames++;
        }

        // Bulk upsert results
        if (results.Count > 0)
        {
            await UpsertResultsAsync(results, cancellationToken);
        }

        _logger.LogInformation(
            "Calculated score state times for {GameCount} games, {ResultCount} team-game records",
            processedGames, results.Count);
    }

    private (GameScoreStateTime home, GameScoreStateTime away) CalculateGameScoreStateTimes(
        string gameId,
        int season,
        string homeTeam,
        string awayTeam,
        List<GoalEvent> goals,
        bool isPlayoffs,
        int finalPeriod)
    {
        // Sort goals by period and time
        var sortedGoals = goals
            .OrderBy(g => g.Period)
            .ThenBy(g => g.Time)
            .ToList();

        int homeLeading = 0, homeTrailing = 0, homeTied = 0;
        int awayLeading = 0, awayTrailing = 0, awayTied = 0;

        int homeScore = 0, awayScore = 0;
        int currentPeriod = 1;
        int lastEventTime = 0;

        foreach (var goal in sortedGoals)
        {
            // Handle period transitions
            while (currentPeriod < goal.Period)
            {
                // Add remaining time in current period
                var periodLength = GetPeriodLength(currentPeriod, isPlayoffs);
                var remainingTime = periodLength - lastEventTime;

                AddTimeToState(homeScore, awayScore, remainingTime,
                    ref homeLeading, ref homeTrailing, ref homeTied,
                    ref awayLeading, ref awayTrailing, ref awayTied);

                currentPeriod++;
                lastEventTime = 0;
            }

            // Add time from last event to this goal
            var elapsed = goal.Time - lastEventTime;
            if (elapsed > 0)
            {
                AddTimeToState(homeScore, awayScore, elapsed,
                    ref homeLeading, ref homeTrailing, ref homeTied,
                    ref awayLeading, ref awayTrailing, ref awayTied);
            }

            // Update score based on which team scored
            if (goal.TeamCode == homeTeam)
                homeScore++;
            else
                awayScore++;

            lastEventTime = goal.Time;
        }

        // Add remaining time after last goal to end of game
        while (currentPeriod <= finalPeriod)
        {
            var periodLength = GetPeriodLength(currentPeriod, isPlayoffs);
            var remainingTime = periodLength - lastEventTime;

            // For overtime, game ends when a goal is scored (sudden death)
            // If we're in the final period and this was the period with the last goal,
            // only add time up to the last goal
            if (currentPeriod == finalPeriod && lastEventTime > 0)
            {
                // Time already accounted for, just finish the period if regulation
                if (currentPeriod <= 3)
                {
                    AddTimeToState(homeScore, awayScore, remainingTime,
                        ref homeLeading, ref homeTrailing, ref homeTied,
                        ref awayLeading, ref awayTrailing, ref awayTied);
                }
                // In OT, game ends with goal - no remaining time
            }
            else
            {
                AddTimeToState(homeScore, awayScore, remainingTime,
                    ref homeLeading, ref homeTrailing, ref homeTied,
                    ref awayLeading, ref awayTrailing, ref awayTied);
            }

            currentPeriod++;
            lastEventTime = 0;
        }

        var now = DateTime.UtcNow;

        return (
            new GameScoreStateTime
            {
                GameId = gameId,
                TeamAbbreviation = homeTeam,
                Season = season,
                IsPlayoffs = isPlayoffs,
                LeadingSeconds = homeLeading,
                TrailingSeconds = homeTrailing,
                TiedSeconds = homeTied,
                CalculatedAt = now
            },
            new GameScoreStateTime
            {
                GameId = gameId,
                TeamAbbreviation = awayTeam,
                Season = season,
                IsPlayoffs = isPlayoffs,
                LeadingSeconds = awayLeading,
                TrailingSeconds = awayTrailing,
                TiedSeconds = awayTied,
                CalculatedAt = now
            }
        );
    }

    private static void AddTimeToState(
        int homeScore, int awayScore, int seconds,
        ref int homeLeading, ref int homeTrailing, ref int homeTied,
        ref int awayLeading, ref int awayTrailing, ref int awayTied)
    {
        if (homeScore > awayScore)
        {
            homeLeading += seconds;
            awayTrailing += seconds;
        }
        else if (awayScore > homeScore)
        {
            homeTrailing += seconds;
            awayLeading += seconds;
        }
        else
        {
            homeTied += seconds;
            awayTied += seconds;
        }
    }

    private static int GetPeriodLength(int period, bool isPlayoffs)
    {
        if (period <= 3)
            return RegulationPeriodSeconds;

        // Overtime
        return isPlayoffs ? PlayoffOvertimeSeconds : OvertimePeriodSeconds;
    }

    private static int DetermineFinalPeriodFromGame(Game game)
    {
        // Check PeriodType for OT indicators
        if (game.PeriodType == "OT")
            return 4;
        if (game.PeriodType == "SO")
            return 3; // Shootout - don't count extra time

        // If scores are tied after regulation, it went to OT
        // But we need the game result - if not tied, game ended in regulation
        if (game.HomeScore != game.AwayScore)
        {
            // Could have ended in regulation or OT
            // Without more data, assume regulation if no OT indicator
            return 3;
        }

        return 3;
    }

    private static int DetermineFinalPeriodFromShots(int maxPeriod, bool wentToOT, bool wentToShootout)
    {
        // Shootout means game ended after OT (period 4), but we don't count shootout time
        if (wentToShootout)
            return 4; // OT happened before shootout

        // If max period > 3, game went to OT
        if (maxPeriod > 3)
            return maxPeriod;

        // If wentToOT flag is set, assume period 4
        if (wentToOT)
            return 4;

        // Regular game ended in regulation
        return 3;
    }

    private async Task UpsertResultsAsync(List<GameScoreStateTime> results, CancellationToken cancellationToken)
    {
        // Delete existing records for these games and upsert
        var gameIds = results.Select(r => r.GameId).Distinct().ToList();

        await _db.GameScoreStateTimes
            .Where(g => gameIds.Contains(g.GameId))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.GameScoreStateTimes.AddRangeAsync(results, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private record GoalEvent
    {
        public required string GameId { get; init; }
        public required string TeamCode { get; init; }
        public required string HomeTeamCode { get; init; }
        public required string AwayTeamCode { get; init; }
        public int Period { get; init; }
        public int Time { get; init; }
        public bool IsPlayoffs { get; init; }
        public int HomeTeamGoals { get; init; }
        public int AwayTeamGoals { get; init; }
        public bool? WentToOT { get; init; }
        public bool? WentToShootout { get; init; }
    }
}
