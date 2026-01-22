using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data.Repositories;

public class ShotRepository(AppDbContext db) : IShotRepository
{
    private const int BatchSize = 500;

    public async Task<int> UpsertBatchAsync(IEnumerable<Shot> shots, CancellationToken cancellationToken = default)
    {
        var shotsList = shots.ToList();
        if (shotsList.Count == 0) return 0;

        var totalUpserted = 0;

        // Process in batches to manage memory
        foreach (var batch in shotsList.Chunk(BatchSize))
        {
            // Deduplicate within batch (keep last occurrence)
            var batchDict = batch.ToDictionary(s => s.ShotId, s => s);
            var batchList = batchDict.Values.ToList();

            // Extract shot IDs to batch-fetch existing records
            var shotIds = batchList.Select(s => s.ShotId).ToList();

            var existingShots = await db.Shots
                .Where(s => shotIds.Contains(s.ShotId))
                .ToDictionaryAsync(s => s.ShotId, cancellationToken);

            var now = DateTime.UtcNow;

            foreach (var shot in batchList)
            {
                if (existingShots.TryGetValue(shot.ShotId, out var existing))
                {
                    // Update existing shot - copy all properties
                    UpdateShotProperties(existing, shot);
                }
                else
                {
                    shot.CreatedAt = now;
                    db.Shots.Add(shot);
                    // Track newly added shots to prevent duplicates within batch
                    existingShots[shot.ShotId] = shot;
                }
            }

            await db.SaveChangesAsync(cancellationToken);
            totalUpserted += batchList.Count;

            // Clear change tracker to free memory
            db.ChangeTracker.Clear();
        }

        return totalUpserted;
    }

    public async Task<IReadOnlyList<Shot>> GetByPlayerAsync(
        int playerId,
        int? season = null,
        int? period = null,
        string? shotType = null,
        bool? goalsOnly = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.Shots.Where(s => s.ShooterPlayerId == playerId);

        if (season.HasValue)
        {
            query = query.Where(s => s.Season == season.Value);
        }

        if (period.HasValue)
        {
            query = query.Where(s => s.Period == period.Value);
        }

        if (!string.IsNullOrEmpty(shotType))
        {
            query = query.Where(s => s.ShotType == shotType);
        }

        if (goalsOnly == true)
        {
            query = query.Where(s => s.IsGoal);
        }

        query = query
            .OrderByDescending(s => s.Season)
            .ThenBy(s => s.GameId)
            .ThenBy(s => s.GameTimeSeconds);

        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Shot>> GetByGameAsync(string gameId, CancellationToken cancellationToken = default)
    {
        return await db.Shots
            .Where(s => s.GameId == gameId)
            .OrderBy(s => s.Period)
            .ThenBy(s => s.GameTimeSeconds)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountBySeasonAsync(int season, CancellationToken cancellationToken = default)
    {
        return await db.Shots.CountAsync(s => s.Season == season, cancellationToken);
    }

    public async Task<IReadOnlyList<Shot>> GetByTeamAsync(
        string teamCode,
        int season,
        bool? isPlayoffs = null,
        int? period = null,
        string? shotType = null,
        int? shooterPlayerId = null,
        string? scoreState = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.Shots.Where(s => s.TeamCode == teamCode && s.Season == season);

        if (isPlayoffs.HasValue)
        {
            query = query.Where(s => s.IsPlayoffGame == isPlayoffs.Value);
        }

        if (period.HasValue)
        {
            query = query.Where(s => s.Period == period.Value);
        }

        if (!string.IsNullOrEmpty(shotType))
        {
            query = query.Where(s => s.ShotType == shotType);
        }

        if (shooterPlayerId.HasValue)
        {
            query = query.Where(s => s.ShooterPlayerId == shooterPlayerId.Value);
        }

        // Filter by score state (leading, trailing, tied)
        // Score state is from the shooting team's perspective
        query = ApplyScoreStateFilter(query, scoreState);

        query = query
            .OrderBy(s => s.GameId)
            .ThenBy(s => s.Period)
            .ThenBy(s => s.GameTimeSeconds);

        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    private static IQueryable<Shot> ApplyScoreStateFilter(IQueryable<Shot> query, string? scoreState)
    {
        return scoreState?.ToLowerInvariant() switch
        {
            "leading" => query.Where(s =>
                (s.IsHomeTeam && s.HomeTeamGoals > s.AwayTeamGoals) ||
                (!s.IsHomeTeam && s.AwayTeamGoals > s.HomeTeamGoals)),
            "trailing" => query.Where(s =>
                (s.IsHomeTeam && s.HomeTeamGoals < s.AwayTeamGoals) ||
                (!s.IsHomeTeam && s.AwayTeamGoals < s.HomeTeamGoals)),
            "tied" => query.Where(s => s.HomeTeamGoals == s.AwayTeamGoals),
            _ => query
        };
    }

    private static void UpdateShotProperties(Shot existing, Shot updated)
    {
        // Identifiers
        existing.GameId = updated.GameId;
        existing.EventId = updated.EventId;
        existing.Season = updated.Season;
        existing.IsPlayoffGame = updated.IsPlayoffGame;

        // Teams
        existing.HomeTeamCode = updated.HomeTeamCode;
        existing.AwayTeamCode = updated.AwayTeamCode;
        existing.Team = updated.Team;
        existing.TeamCode = updated.TeamCode;
        existing.IsHomeTeam = updated.IsHomeTeam;
        existing.HomeTeamWon = updated.HomeTeamWon;

        // Players
        existing.ShooterPlayerId = updated.ShooterPlayerId;
        existing.ShooterName = updated.ShooterName;
        existing.ShooterLeftRight = updated.ShooterLeftRight;
        existing.ShooterPosition = updated.ShooterPosition;
        existing.ShooterJerseyNumber = updated.ShooterJerseyNumber;
        existing.GoaliePlayerId = updated.GoaliePlayerId;
        existing.GoalieName = updated.GoalieName;
        existing.LastEventPlayerNumber = updated.LastEventPlayerNumber;

        // Event Details
        existing.Event = updated.Event;
        existing.IsGoal = updated.IsGoal;
        existing.ShotType = updated.ShotType;
        existing.Period = updated.Period;
        existing.GameTimeSeconds = updated.GameTimeSeconds;
        existing.TimeLeft = updated.TimeLeft;

        // Location (raw)
        existing.XCoord = updated.XCoord;
        existing.YCoord = updated.YCoord;
        existing.Location = updated.Location;

        // Location (adjusted)
        existing.XCoordAdjusted = updated.XCoordAdjusted;
        existing.YCoordAdjusted = updated.YCoordAdjusted;
        existing.ArenaAdjustedXCoord = updated.ArenaAdjustedXCoord;
        existing.ArenaAdjustedYCoord = updated.ArenaAdjustedYCoord;
        existing.ArenaAdjustedXCoordAbs = updated.ArenaAdjustedXCoordAbs;
        existing.ArenaAdjustedYCoordAbs = updated.ArenaAdjustedYCoordAbs;
        existing.ShotDistance = updated.ShotDistance;
        existing.ShotAngle = updated.ShotAngle;
        existing.ShotAngleAdjusted = updated.ShotAngleAdjusted;
        existing.ArenaAdjustedShotDistance = updated.ArenaAdjustedShotDistance;

        // Shot Characteristics
        existing.ShotOnEmptyNet = updated.ShotOnEmptyNet;
        existing.ShotRebound = updated.ShotRebound;
        existing.ShotRush = updated.ShotRush;
        existing.OffWing = updated.OffWing;
        existing.ShotWasOnGoal = updated.ShotWasOnGoal;

        // Play Continuation
        existing.ShotPlayContinued = updated.ShotPlayContinued;
        existing.ShotPlayContinuedInZone = updated.ShotPlayContinuedInZone;
        existing.ShotPlayContinuedOutsideZone = updated.ShotPlayContinuedOutsideZone;
        existing.ShotGoalieFroze = updated.ShotGoalieFroze;
        existing.ShotPlayStopped = updated.ShotPlayStopped;
        existing.ShotGeneratedRebound = updated.ShotGeneratedRebound;

        // Timing
        existing.TimeUntilNextEvent = updated.TimeUntilNextEvent;
        existing.TimeSinceLastEvent = updated.TimeSinceLastEvent;
        existing.TimeBetweenEvents = updated.TimeBetweenEvents;
        existing.TimeSinceFaceoff = updated.TimeSinceFaceoff;
        existing.ShooterTimeOnIce = updated.ShooterTimeOnIce;
        existing.ShooterTimeOnIceSinceFaceoff = updated.ShooterTimeOnIceSinceFaceoff;
        existing.TimeDifferenceSinceChange = updated.TimeDifferenceSinceChange;

        // Score State
        existing.HomeTeamGoals = updated.HomeTeamGoals;
        existing.AwayTeamGoals = updated.AwayTeamGoals;
        existing.HomeTeamScore = updated.HomeTeamScore;
        existing.RoadTeamScore = updated.RoadTeamScore;
        existing.HomeEmptyNet = updated.HomeEmptyNet;
        existing.AwayEmptyNet = updated.AwayEmptyNet;

        // Game State
        existing.GameOver = updated.GameOver;
        existing.WentToOT = updated.WentToOT;
        existing.WentToShootout = updated.WentToShootout;
        existing.HomeWinProbability = updated.HomeWinProbability;

        // Skaters On Ice
        existing.HomeSkatersOnIce = updated.HomeSkatersOnIce;
        existing.AwaySkatersOnIce = updated.AwaySkatersOnIce;
        existing.ShootingTeamForwardsOnIce = updated.ShootingTeamForwardsOnIce;
        existing.ShootingTeamDefencemenOnIce = updated.ShootingTeamDefencemenOnIce;
        existing.DefendingTeamForwardsOnIce = updated.DefendingTeamForwardsOnIce;
        existing.DefendingTeamDefencemenOnIce = updated.DefendingTeamDefencemenOnIce;

        // Time On Ice Stats (Shooting Team)
        existing.ShootingTeamAverageTimeOnIce = updated.ShootingTeamAverageTimeOnIce;
        existing.ShootingTeamMaxTimeOnIce = updated.ShootingTeamMaxTimeOnIce;
        existing.ShootingTeamMinTimeOnIce = updated.ShootingTeamMinTimeOnIce;
        existing.ShootingTeamAverageTimeOnIceOfForwards = updated.ShootingTeamAverageTimeOnIceOfForwards;
        existing.ShootingTeamMaxTimeOnIceOfForwards = updated.ShootingTeamMaxTimeOnIceOfForwards;
        existing.ShootingTeamMinTimeOnIceOfForwards = updated.ShootingTeamMinTimeOnIceOfForwards;
        existing.ShootingTeamAverageTimeOnIceOfDefencemen = updated.ShootingTeamAverageTimeOnIceOfDefencemen;
        existing.ShootingTeamMaxTimeOnIceOfDefencemen = updated.ShootingTeamMaxTimeOnIceOfDefencemen;
        existing.ShootingTeamMinTimeOnIceOfDefencemen = updated.ShootingTeamMinTimeOnIceOfDefencemen;

        // Time On Ice Since Faceoff (Shooting Team)
        existing.ShootingTeamAverageTimeOnIceSinceFaceoff = updated.ShootingTeamAverageTimeOnIceSinceFaceoff;
        existing.ShootingTeamMaxTimeOnIceSinceFaceoff = updated.ShootingTeamMaxTimeOnIceSinceFaceoff;
        existing.ShootingTeamMinTimeOnIceSinceFaceoff = updated.ShootingTeamMinTimeOnIceSinceFaceoff;
        existing.ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards = updated.ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards;
        existing.ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards = updated.ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards;
        existing.ShootingTeamMinTimeOnIceSinceFaceoffOfForwards = updated.ShootingTeamMinTimeOnIceSinceFaceoffOfForwards;
        existing.ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen = updated.ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen;
        existing.ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen = updated.ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen;
        existing.ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen = updated.ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen;

        // Time On Ice Stats (Defending Team)
        existing.DefendingTeamAverageTimeOnIce = updated.DefendingTeamAverageTimeOnIce;
        existing.DefendingTeamMaxTimeOnIce = updated.DefendingTeamMaxTimeOnIce;
        existing.DefendingTeamMinTimeOnIce = updated.DefendingTeamMinTimeOnIce;
        existing.DefendingTeamAverageTimeOnIceOfForwards = updated.DefendingTeamAverageTimeOnIceOfForwards;
        existing.DefendingTeamMaxTimeOnIceOfForwards = updated.DefendingTeamMaxTimeOnIceOfForwards;
        existing.DefendingTeamMinTimeOnIceOfForwards = updated.DefendingTeamMinTimeOnIceOfForwards;
        existing.DefendingTeamAverageTimeOnIceOfDefencemen = updated.DefendingTeamAverageTimeOnIceOfDefencemen;
        existing.DefendingTeamMaxTimeOnIceOfDefencemen = updated.DefendingTeamMaxTimeOnIceOfDefencemen;
        existing.DefendingTeamMinTimeOnIceOfDefencemen = updated.DefendingTeamMinTimeOnIceOfDefencemen;

        // Time On Ice Since Faceoff (Defending Team)
        existing.DefendingTeamAverageTimeOnIceSinceFaceoff = updated.DefendingTeamAverageTimeOnIceSinceFaceoff;
        existing.DefendingTeamMaxTimeOnIceSinceFaceoff = updated.DefendingTeamMaxTimeOnIceSinceFaceoff;
        existing.DefendingTeamMinTimeOnIceSinceFaceoff = updated.DefendingTeamMinTimeOnIceSinceFaceoff;
        existing.DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards = updated.DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards;
        existing.DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards = updated.DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards;
        existing.DefendingTeamMinTimeOnIceSinceFaceoffOfForwards = updated.DefendingTeamMinTimeOnIceSinceFaceoffOfForwards;
        existing.DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen = updated.DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen;
        existing.DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen = updated.DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen;
        existing.DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen = updated.DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen;

        // Penalties
        existing.AwayPenalty1TimeLeft = updated.AwayPenalty1TimeLeft;
        existing.AwayPenalty1Length = updated.AwayPenalty1Length;
        existing.HomePenalty1TimeLeft = updated.HomePenalty1TimeLeft;
        existing.HomePenalty1Length = updated.HomePenalty1Length;
        existing.PenaltyLength = updated.PenaltyLength;

        // Previous Event
        existing.LastEventXCoord = updated.LastEventXCoord;
        existing.LastEventYCoord = updated.LastEventYCoord;
        existing.LastEventXCoordAdjusted = updated.LastEventXCoordAdjusted;
        existing.LastEventYCoordAdjusted = updated.LastEventYCoordAdjusted;
        existing.LastEventShotAngle = updated.LastEventShotAngle;
        existing.LastEventShotDistance = updated.LastEventShotDistance;
        existing.LastEventCategory = updated.LastEventCategory;
        existing.LastEventTeam = updated.LastEventTeam;
        existing.DistanceFromLastEvent = updated.DistanceFromLastEvent;
        existing.SpeedFromLastEvent = updated.SpeedFromLastEvent;
        existing.AverageRestDifference = updated.AverageRestDifference;

        // Expected Goals Model
        existing.XGoal = updated.XGoal;
        existing.XFroze = updated.XFroze;
        existing.XRebound = updated.XRebound;
        existing.XPlayContinuedInZone = updated.XPlayContinuedInZone;
        existing.XPlayContinuedOutsideZone = updated.XPlayContinuedOutsideZone;
        existing.XPlayStopped = updated.XPlayStopped;
        existing.XShotWasOnGoal = updated.XShotWasOnGoal;
        existing.ShotGoalProbability = updated.ShotGoalProbability;

        // Rebound Analysis
        existing.ShotAnglePlusRebound = updated.ShotAnglePlusRebound;
        existing.ShotAnglePlusReboundSpeed = updated.ShotAnglePlusReboundSpeed;
        existing.ShotAngleReboundRoyalRoad = updated.ShotAngleReboundRoyalRoad;
    }

    public async Task<IReadOnlyList<Shot>> GetRecentByPlayerAsync(
        int playerId,
        int season,
        int gameLimit = 20,
        CancellationToken cancellationToken = default)
    {
        // First, get the most recent N distinct game IDs for this player
        var recentGameIds = await db.Shots
            .Where(s => s.ShooterPlayerId == playerId && s.Season == season && !s.IsPlayoffGame)
            .Select(s => s.GameId)
            .Distinct()
            .OrderByDescending(g => g) // GameId format: 2024020501 - higher = more recent
            .Take(gameLimit)
            .ToListAsync(cancellationToken);

        if (recentGameIds.Count == 0)
            return [];

        // Then fetch all shots from those games for this player
        return await db.Shots
            .Where(s => s.ShooterPlayerId == playerId && recentGameIds.Contains(s.GameId))
            .OrderByDescending(s => s.GameId)
            .ThenBy(s => s.Period)
            .ThenBy(s => s.GameTimeSeconds)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Shot>> GetAgainstTeamAsync(
        string teamCode,
        int season,
        bool? isPlayoffs = null,
        int? period = null,
        string? shotType = null,
        string? scoreState = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        // Get shots where this team was defending (opponent's shots against us)
        // Shot.TeamCode is the shooting team, so we want shots where:
        // - HomeTeamCode == teamCode AND TeamCode != teamCode (we're home, opponent shooting)
        // - OR AwayTeamCode == teamCode AND TeamCode != teamCode (we're away, opponent shooting)
        var query = db.Shots.Where(s =>
            s.Season == season &&
            s.TeamCode != teamCode &&
            (s.HomeTeamCode == teamCode || s.AwayTeamCode == teamCode));

        if (isPlayoffs.HasValue)
        {
            query = query.Where(s => s.IsPlayoffGame == isPlayoffs.Value);
        }

        if (period.HasValue)
        {
            query = query.Where(s => s.Period == period.Value);
        }

        if (!string.IsNullOrEmpty(shotType))
        {
            query = query.Where(s => s.ShotType == shotType);
        }

        // Filter by score state - note: for "against" shots, the score state
        // is inverted from the defending team's perspective
        query = ApplyScoreStateFilterForDefending(query, scoreState, teamCode);

        query = query
            .OrderBy(s => s.GameId)
            .ThenBy(s => s.Period)
            .ThenBy(s => s.GameTimeSeconds);

        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    private static IQueryable<Shot> ApplyScoreStateFilterForDefending(
        IQueryable<Shot> query,
        string? scoreState,
        string defendingTeamCode)
    {
        // For "against" shots, we filter based on the DEFENDING team's perspective
        // e.g., "leading" means the defending team was leading when the shot was taken against them
        return scoreState?.ToLowerInvariant() switch
        {
            "leading" => query.Where(s =>
                (s.HomeTeamCode == defendingTeamCode && s.HomeTeamGoals > s.AwayTeamGoals) ||
                (s.AwayTeamCode == defendingTeamCode && s.HomeTeamCode != defendingTeamCode && s.AwayTeamGoals > s.HomeTeamGoals)),
            "trailing" => query.Where(s =>
                (s.HomeTeamCode == defendingTeamCode && s.HomeTeamGoals < s.AwayTeamGoals) ||
                (s.AwayTeamCode == defendingTeamCode && s.HomeTeamCode != defendingTeamCode && s.AwayTeamGoals < s.HomeTeamGoals)),
            "tied" => query.Where(s => s.HomeTeamGoals == s.AwayTeamGoals),
            _ => query
        };
    }

    public async Task<IReadOnlyList<Shot>> GetRecentByGoalieAsync(
        int goaliePlayerId,
        int season,
        int gameLimit = 30,
        CancellationToken cancellationToken = default)
    {
        // Get distinct game IDs where this goalie faced shots (excluding empty net)
        var recentGameIds = await db.Shots
            .Where(s => s.GoaliePlayerId == goaliePlayerId
                        && s.Season == season
                        && !s.IsPlayoffGame
                        && !s.ShotOnEmptyNet)
            .Select(s => s.GameId)
            .Distinct()
            .OrderByDescending(g => g) // GameId format: 2024020501 - higher = more recent
            .Take(gameLimit)
            .ToListAsync(cancellationToken);

        if (recentGameIds.Count == 0)
            return [];

        // Fetch all shots faced in those games (excluding empty net)
        return await db.Shots
            .Where(s => s.GoaliePlayerId == goaliePlayerId
                        && recentGameIds.Contains(s.GameId)
                        && !s.ShotOnEmptyNet)
            .OrderByDescending(s => s.GameId)
            .ThenBy(s => s.Period)
            .ThenBy(s => s.GameTimeSeconds)
            .ToListAsync(cancellationToken);
    }
}
