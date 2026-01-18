namespace Benchwarmer.Data.Entities;

public class Shot
{
    public long Id { get; set; }

    public required string ShotId { get; set; }
    public required string GameId { get; set; }
    public int EventId { get; set; }
    public int Season { get; set; }
    public bool IsPlayoffGame { get; set; }

    public required string HomeTeamCode { get; set; }
    public required string AwayTeamCode { get; set; }
    public required string Team { get; set; }
    public required string TeamCode { get; set; }
    public bool IsHomeTeam { get; set; }
    public bool HomeTeamWon { get; set; }

    public int? ShooterPlayerId { get; set; }
    public string? ShooterName { get; set; }
    public string? ShooterLeftRight { get; set; }
    public string? ShooterPosition { get; set; }
    public int? ShooterJerseyNumber { get; set; }
    public int? GoaliePlayerId { get; set; }
    public string? GoalieName { get; set; }
    public int? LastEventPlayerNumber { get; set; }

    public required string Event { get; set; }
    public bool IsGoal { get; set; }
    public string? ShotType { get; set; }
    public int Period { get; set; }
    public int GameTimeSeconds { get; set; }
    public int? TimeLeft { get; set; }

    public decimal? XCoord { get; set; }
    public decimal? YCoord { get; set; }
    public string? Location { get; set; }

    public decimal? XCoordAdjusted { get; set; }
    public decimal? YCoordAdjusted { get; set; }
    public decimal? ArenaAdjustedXCoord { get; set; }
    public decimal? ArenaAdjustedYCoord { get; set; }
    public decimal? ArenaAdjustedXCoordAbs { get; set; }
    public decimal? ArenaAdjustedYCoordAbs { get; set; }
    public decimal? ShotDistance { get; set; }
    public decimal? ShotAngle { get; set; }
    public decimal? ShotAngleAdjusted { get; set; }
    public decimal? ArenaAdjustedShotDistance { get; set; }

    public bool ShotOnEmptyNet { get; set; }
    public bool ShotRebound { get; set; }
    public bool ShotRush { get; set; }
    public bool OffWing { get; set; }
    public bool ShotWasOnGoal { get; set; }

    public bool ShotPlayContinued { get; set; }
    public bool ShotPlayContinuedInZone { get; set; }
    public bool ShotPlayContinuedOutsideZone { get; set; }
    public bool ShotGoalieFroze { get; set; }
    public bool ShotPlayStopped { get; set; }
    public bool ShotGeneratedRebound { get; set; }

    public decimal? TimeUntilNextEvent { get; set; }
    public decimal? TimeSinceLastEvent { get; set; }
    public decimal? TimeBetweenEvents { get; set; }
    public decimal? TimeSinceFaceoff { get; set; }
    public decimal? ShooterTimeOnIce { get; set; }
    public decimal? ShooterTimeOnIceSinceFaceoff { get; set; }
    public decimal? TimeDifferenceSinceChange { get; set; }

    public int HomeTeamGoals { get; set; }
    public int AwayTeamGoals { get; set; }
    public int? HomeTeamScore { get; set; }
    public int? RoadTeamScore { get; set; }
    public bool HomeEmptyNet { get; set; }
    public bool AwayEmptyNet { get; set; }

    public bool? GameOver { get; set; }
    public bool? WentToOT { get; set; }
    public bool? WentToShootout { get; set; }
    public decimal? HomeWinProbability { get; set; }

    public int HomeSkatersOnIce { get; set; }
    public int AwaySkatersOnIce { get; set; }
    public int ShootingTeamForwardsOnIce { get; set; }
    public int ShootingTeamDefencemenOnIce { get; set; }
    public int DefendingTeamForwardsOnIce { get; set; }
    public int DefendingTeamDefencemenOnIce { get; set; }

    public decimal? ShootingTeamAverageTimeOnIce { get; set; }
    public decimal? ShootingTeamMaxTimeOnIce { get; set; }
    public decimal? ShootingTeamMinTimeOnIce { get; set; }
    public decimal? ShootingTeamAverageTimeOnIceOfForwards { get; set; }
    public decimal? ShootingTeamMaxTimeOnIceOfForwards { get; set; }
    public decimal? ShootingTeamMinTimeOnIceOfForwards { get; set; }
    public decimal? ShootingTeamAverageTimeOnIceOfDefencemen { get; set; }
    public decimal? ShootingTeamMaxTimeOnIceOfDefencemen { get; set; }
    public decimal? ShootingTeamMinTimeOnIceOfDefencemen { get; set; }

    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoff { get; set; }
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoff { get; set; }
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoff { get; set; }
    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen { get; set; }
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen { get; set; }
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    public decimal? DefendingTeamAverageTimeOnIce { get; set; }
    public decimal? DefendingTeamMaxTimeOnIce { get; set; }
    public decimal? DefendingTeamMinTimeOnIce { get; set; }
    public decimal? DefendingTeamAverageTimeOnIceOfForwards { get; set; }
    public decimal? DefendingTeamMaxTimeOnIceOfForwards { get; set; }
    public decimal? DefendingTeamMinTimeOnIceOfForwards { get; set; }
    public decimal? DefendingTeamAverageTimeOnIceOfDefencemen { get; set; }
    public decimal? DefendingTeamMaxTimeOnIceOfDefencemen { get; set; }
    public decimal? DefendingTeamMinTimeOnIceOfDefencemen { get; set; }

    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoff { get; set; }
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoff { get; set; }
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoff { get; set; }
    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoffOfForwards { get; set; }
    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen { get; set; }
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen { get; set; }
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    public decimal? AwayPenalty1TimeLeft { get; set; }
    public decimal? AwayPenalty1Length { get; set; }
    public decimal? HomePenalty1TimeLeft { get; set; }
    public decimal? HomePenalty1Length { get; set; }
    public decimal? PenaltyLength { get; set; }

    public decimal? LastEventXCoord { get; set; }
    public decimal? LastEventYCoord { get; set; }
    public decimal? LastEventXCoordAdjusted { get; set; }
    public decimal? LastEventYCoordAdjusted { get; set; }
    public decimal? LastEventShotAngle { get; set; }
    public decimal? LastEventShotDistance { get; set; }
    public string? LastEventCategory { get; set; }
    public string? LastEventTeam { get; set; }
    public decimal? DistanceFromLastEvent { get; set; }
    public decimal? SpeedFromLastEvent { get; set; }
    public decimal? AverageRestDifference { get; set; }

    public decimal? XGoal { get; set; }
    public decimal? XFroze { get; set; }
    public decimal? XRebound { get; set; }
    public decimal? XPlayContinuedInZone { get; set; }
    public decimal? XPlayContinuedOutsideZone { get; set; }
    public decimal? XPlayStopped { get; set; }
    public decimal? XShotWasOnGoal { get; set; }
    public decimal? ShotGoalProbability { get; set; }

    public decimal? ShotAnglePlusRebound { get; set; }
    public decimal? ShotAnglePlusReboundSpeed { get; set; }
    public bool ShotAngleReboundRoyalRoad { get; set; }
    public DateTime CreatedAt { get; set; }

    public Player? Shooter { get; set; }
    public Player? Goalie { get; set; }
}
