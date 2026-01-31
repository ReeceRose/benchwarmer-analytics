using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class ShotImporter(
    IShotRepository shotRepository,
    ILogger<ShotImporter> logger)
{
    private readonly IShotRepository _shotRepository = shotRepository;
    private readonly ILogger<ShotImporter> _logger = logger;

    private const int BatchSize = 1000;

    public async Task<int> ImportAsync(IEnumerable<ShotRecord> shots, CancellationToken cancellationToken = default)
    {
        var totalCount = 0;
        var shotsList = shots.ToList();

        _logger.LogInformation("Starting import of {Count} shot records", shotsList.Count);

        // Process in batches to manage memory
        foreach (var batch in shotsList.Chunk(BatchSize))
        {
            var entities = batch.Select(ConvertToEntity).ToList();
            var upsertedCount = await _shotRepository.UpsertBatchAsync(entities, cancellationToken);
            totalCount += upsertedCount;

            _logger.LogDebug("Imported batch of {Count} shots, total: {Total}", upsertedCount, totalCount);
        }

        _logger.LogInformation("Completed import of {Count} shot records", totalCount);
        return totalCount;
    }

    private static Shot ConvertToEntity(ShotRecord record)
    {
        return new Shot
        {
            // Identifiers
            ShotId = record.ShotId,
            GameId = ConvertToNhlGameId(record.GameId, record.Season),
            EventId = (int)record.EventId,
            Season = record.Season,
            IsPlayoffGame = record.IsPlayoffGame != 0,

            // Teams (normalized)
            HomeTeamCode = TeamAbbreviationNormalizer.NormalizeOrNull(record.HomeTeamCode)!,
            AwayTeamCode = TeamAbbreviationNormalizer.NormalizeOrNull(record.AwayTeamCode)!,
            Team = TeamAbbreviationNormalizer.NormalizeOrNull(record.Team)!,
            TeamCode = TeamAbbreviationNormalizer.NormalizeOrNull(record.TeamCode)!,
            IsHomeTeam = record.IsHomeTeam != 0,
            HomeTeamWon = record.HomeTeamWon != 0,

            // Players (convert decimal IDs to int)
            ShooterPlayerId = record.ShooterPlayerId.HasValue ? (int)record.ShooterPlayerId.Value : null,
            ShooterName = record.ShooterName,
            ShooterLeftRight = record.ShooterLeftRight,
            ShooterPosition = record.ShooterPosition,
            ShooterJerseyNumber = record.ShooterJerseyNumber.HasValue ? (int)record.ShooterJerseyNumber.Value : null,
            GoaliePlayerId = record.GoaliePlayerId.HasValue ? (int)record.GoaliePlayerId.Value : null,
            GoalieName = record.GoalieName,
            LastEventPlayerNumber = record.LastEventPlayerNumber.HasValue ? (int)record.LastEventPlayerNumber.Value : null,

            // Event Details
            Event = record.Event,
            IsGoal = record.Goal != 0,
            ShotType = record.ShotType,
            Period = (int)record.Period,
            GameTimeSeconds = (int)record.GameTimeSeconds,
            TimeLeft = record.TimeLeft.HasValue ? (int)record.TimeLeft.Value : null,

            // Location (raw)
            XCoord = record.XCoord,
            YCoord = record.YCoord,
            Location = record.Location,

            // Location (adjusted)
            XCoordAdjusted = record.XCoordAdjusted,
            YCoordAdjusted = record.YCoordAdjusted,
            ArenaAdjustedXCoord = record.ArenaAdjustedXCoord,
            ArenaAdjustedYCoord = record.ArenaAdjustedYCoord,
            ArenaAdjustedXCoordAbs = record.ArenaAdjustedXCoordAbs,
            ArenaAdjustedYCoordAbs = record.ArenaAdjustedYCoordAbs,
            ShotDistance = record.ShotDistance,
            ShotAngle = record.ShotAngle,
            ShotAngleAdjusted = record.ShotAngleAdjusted,
            ArenaAdjustedShotDistance = record.ArenaAdjustedShotDistance,

            // Shot Characteristics
            ShotOnEmptyNet = record.ShotOnEmptyNet != 0,
            ShotRebound = record.ShotRebound != 0,
            ShotRush = record.ShotRush != 0,
            OffWing = record.OffWing != 0,
            ShotWasOnGoal = record.ShotWasOnGoal != 0,

            // Play Continuation
            ShotPlayContinued = record.ShotPlayContinued.HasValue && record.ShotPlayContinued != 0,
            ShotPlayContinuedInZone = record.ShotPlayContinuedInZone != 0,
            ShotPlayContinuedOutsideZone = record.ShotPlayContinuedOutsideZone != 0,
            ShotGoalieFroze = record.ShotGoalieFroze != 0,
            ShotPlayStopped = record.ShotPlayStopped != 0,
            ShotGeneratedRebound = record.ShotGeneratedRebound != 0,

            // Timing
            TimeUntilNextEvent = record.TimeUntilNextEvent,
            TimeSinceLastEvent = record.TimeSinceLastEvent,
            TimeBetweenEvents = record.TimeBetweenEvents,
            TimeSinceFaceoff = record.TimeSinceFaceoff,
            ShooterTimeOnIce = record.ShooterTimeOnIce,
            ShooterTimeOnIceSinceFaceoff = record.ShooterTimeOnIceSinceFaceoff,
            TimeDifferenceSinceChange = record.TimeDifferenceSinceChange,

            // Score State
            HomeTeamGoals = (int)record.HomeTeamGoals,
            AwayTeamGoals = (int)record.AwayTeamGoals,
            HomeTeamScore = record.HomeTeamScore.HasValue ? (int)record.HomeTeamScore.Value : null,
            RoadTeamScore = record.RoadTeamScore.HasValue ? (int)record.RoadTeamScore.Value : null,
            HomeEmptyNet = record.HomeEmptyNet != 0,
            AwayEmptyNet = record.AwayEmptyNet != 0,

            // Game State
            GameOver = record.GameOver.HasValue ? record.GameOver != 0 : null,
            WentToOT = record.WentToOT.HasValue ? record.WentToOT != 0 : null,
            WentToShootout = record.WentToShootout.HasValue ? record.WentToShootout != 0 : null,
            HomeWinProbability = record.HomeWinProbability,

            // Skaters On Ice
            HomeSkatersOnIce = (int)record.HomeSkatersOnIce,
            AwaySkatersOnIce = (int)record.AwaySkatersOnIce,
            ShootingTeamForwardsOnIce = (int)record.ShootingTeamForwardsOnIce,
            ShootingTeamDefencemenOnIce = (int)record.ShootingTeamDefencemenOnIce,
            DefendingTeamForwardsOnIce = (int)record.DefendingTeamForwardsOnIce,
            DefendingTeamDefencemenOnIce = (int)record.DefendingTeamDefencemenOnIce,

            // Time On Ice Stats (Shooting Team)
            ShootingTeamAverageTimeOnIce = record.ShootingTeamAverageTimeOnIce,
            ShootingTeamMaxTimeOnIce = record.ShootingTeamMaxTimeOnIce,
            ShootingTeamMinTimeOnIce = record.ShootingTeamMinTimeOnIce,
            ShootingTeamAverageTimeOnIceOfForwards = record.ShootingTeamAverageTimeOnIceOfForwards,
            ShootingTeamMaxTimeOnIceOfForwards = record.ShootingTeamMaxTimeOnIceOfForwards,
            ShootingTeamMinTimeOnIceOfForwards = record.ShootingTeamMinTimeOnIceOfForwards,
            ShootingTeamAverageTimeOnIceOfDefencemen = record.ShootingTeamAverageTimeOnIceOfDefencemen,
            ShootingTeamMaxTimeOnIceOfDefencemen = record.ShootingTeamMaxTimeOnIceOfDefencemen,
            ShootingTeamMinTimeOnIceOfDefencemen = record.ShootingTeamMinTimeOnIceOfDefencemen,

            // Time On Ice Since Faceoff (Shooting Team)
            ShootingTeamAverageTimeOnIceSinceFaceoff = record.ShootingTeamAverageTimeOnIceSinceFaceoff,
            ShootingTeamMaxTimeOnIceSinceFaceoff = record.ShootingTeamMaxTimeOnIceSinceFaceoff,
            ShootingTeamMinTimeOnIceSinceFaceoff = record.ShootingTeamMinTimeOnIceSinceFaceoff,
            ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards = record.ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards,
            ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards = record.ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards,
            ShootingTeamMinTimeOnIceSinceFaceoffOfForwards = record.ShootingTeamMinTimeOnIceSinceFaceoffOfForwards,
            ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen = record.ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen,
            ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen = record.ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen,
            ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen = record.ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen,

            // Time On Ice Stats (Defending Team)
            DefendingTeamAverageTimeOnIce = record.DefendingTeamAverageTimeOnIce,
            DefendingTeamMaxTimeOnIce = record.DefendingTeamMaxTimeOnIce,
            DefendingTeamMinTimeOnIce = record.DefendingTeamMinTimeOnIce,
            DefendingTeamAverageTimeOnIceOfForwards = record.DefendingTeamAverageTimeOnIceOfForwards,
            DefendingTeamMaxTimeOnIceOfForwards = record.DefendingTeamMaxTimeOnIceOfForwards,
            DefendingTeamMinTimeOnIceOfForwards = record.DefendingTeamMinTimeOnIceOfForwards,
            DefendingTeamAverageTimeOnIceOfDefencemen = record.DefendingTeamAverageTimeOnIceOfDefencemen,
            DefendingTeamMaxTimeOnIceOfDefencemen = record.DefendingTeamMaxTimeOnIceOfDefencemen,
            DefendingTeamMinTimeOnIceOfDefencemen = record.DefendingTeamMinTimeOnIceOfDefencemen,

            // Time On Ice Since Faceoff (Defending Team)
            DefendingTeamAverageTimeOnIceSinceFaceoff = record.DefendingTeamAverageTimeOnIceSinceFaceoff,
            DefendingTeamMaxTimeOnIceSinceFaceoff = record.DefendingTeamMaxTimeOnIceSinceFaceoff,
            DefendingTeamMinTimeOnIceSinceFaceoff = record.DefendingTeamMinTimeOnIceSinceFaceoff,
            DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards = record.DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards,
            DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards = record.DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards,
            DefendingTeamMinTimeOnIceSinceFaceoffOfForwards = record.DefendingTeamMinTimeOnIceSinceFaceoffOfForwards,
            DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen = record.DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen,
            DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen = record.DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen,
            DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen = record.DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen,

            // Penalties
            AwayPenalty1TimeLeft = record.AwayPenalty1TimeLeft,
            AwayPenalty1Length = record.AwayPenalty1Length,
            HomePenalty1TimeLeft = record.HomePenalty1TimeLeft,
            HomePenalty1Length = record.HomePenalty1Length,
            PenaltyLength = record.PenaltyLength,

            // Previous Event
            LastEventXCoord = record.LastEventXCoord,
            LastEventYCoord = record.LastEventYCoord,
            LastEventXCoordAdjusted = record.LastEventXCoordAdjusted,
            LastEventYCoordAdjusted = record.LastEventYCoordAdjusted,
            LastEventShotAngle = record.LastEventShotAngle,
            LastEventShotDistance = record.LastEventShotDistance,
            LastEventCategory = record.LastEventCategory,
            LastEventTeam = record.LastEventTeam,
            DistanceFromLastEvent = record.DistanceFromLastEvent,
            SpeedFromLastEvent = record.SpeedFromLastEvent,
            AverageRestDifference = record.AverageRestDifference,

            // Expected Goals Model
            XGoal = record.XGoal,
            XFroze = record.XFroze,
            XRebound = record.XRebound,
            XPlayContinuedInZone = record.XPlayContinuedInZone,
            XPlayContinuedOutsideZone = record.XPlayContinuedOutsideZone,
            XPlayStopped = record.XPlayStopped,
            XShotWasOnGoal = record.XShotWasOnGoal,
            ShotGoalProbability = record.ShotGoalProbability,

            // Rebound Analysis
            ShotAnglePlusRebound = record.ShotAnglePlusRebound,
            ShotAnglePlusReboundSpeed = record.ShotAnglePlusReboundSpeed,
            ShotAngleReboundRoyalRoad = record.ShotAngleReboundRoyalRoad != 0
        };
    }

    /// <summary>
    /// Converts MoneyPuck game_id format to NHL API game_id format.
    /// MoneyPuck: "20004" = game type 2 (regular season) + game number 0004
    /// NHL API: "2025020004" = season 2025 + type 02 + game 0004
    /// </summary>
    private static string ConvertToNhlGameId(string moneyPuckGameId, int season)
    {
        if (string.IsNullOrEmpty(moneyPuckGameId) || moneyPuckGameId.Length < 2)
            return moneyPuckGameId;

        // MoneyPuck format: first digit is game type (2=regular, 3=playoff), rest is game number
        var gameType = moneyPuckGameId[0];
        var gameNumber = moneyPuckGameId[1..];

        // NHL format: YYYYTTGGGG where YYYY=season, TT=type (02=regular, 03=playoff), GGGG=game number
        var nhlGameType = gameType == '3' ? "03" : "02";
        var paddedGameNumber = gameNumber.PadLeft(4, '0');

        return $"{season}{nhlGameType}{paddedGameNumber}";
    }
}
