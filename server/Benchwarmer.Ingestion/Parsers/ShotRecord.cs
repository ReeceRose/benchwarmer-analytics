using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class ShotRecord
{
    [Name("shotID")]
    public string ShotId { get; set; } = "";

    [Name("game_id")]
    public string GameId { get; set; } = "";

    [Name("id")]
    public decimal EventId { get; set; }

    [Name("season")]
    public int Season { get; set; }

    [Name("isPlayoffGame")]
    public decimal IsPlayoffGame { get; set; }

    [Name("playoffGame")]
    public decimal? PlayoffGame { get; set; }

    [Name("homeTeamCode")]
    public string HomeTeamCode { get; set; } = "";

    [Name("awayTeamCode")]
    public string AwayTeamCode { get; set; } = "";

    [Name("roadTeamCode")]
    public string? RoadTeamCode { get; set; }

    [Name("team")]
    public string Team { get; set; } = "";

    [Name("teamCode")]
    public string TeamCode { get; set; } = "";

    [Name("isHomeTeam")]
    public decimal IsHomeTeam { get; set; }

    [Name("homeTeamWon")]
    public decimal HomeTeamWon { get; set; }

    [Name("shooterPlayerId")]
    public decimal? ShooterPlayerId { get; set; }

    [Name("shooterName")]
    public string? ShooterName { get; set; }

    [Name("shooterLeftRight")]
    public string? ShooterLeftRight { get; set; }

    [Name("playerPositionThatDidEvent")]
    public string? ShooterPosition { get; set; }

    [Name("playerNumThatDidEvent")]
    public decimal? ShooterJerseyNumber { get; set; }

    [Name("goalieIdForShot")]
    public decimal? GoaliePlayerId { get; set; }

    [Name("goalieNameForShot")]
    public string? GoalieName { get; set; }

    [Name("playerNumThatDidLastEvent")]
    public decimal? LastEventPlayerNumber { get; set; }

    [Name("event")]
    public string Event { get; set; } = "";

    [Name("goal")]
    public decimal Goal { get; set; }

    [Name("shotType")]
    public string? ShotType { get; set; }

    [Name("period")]
    public decimal Period { get; set; }

    [Name("time")]
    public decimal GameTimeSeconds { get; set; }

    [Name("timeLeft")]
    public decimal? TimeLeft { get; set; }

    [Name("xCord")]
    public decimal? XCoord { get; set; }

    [Name("yCord")]
    public decimal? YCoord { get; set; }

    [Name("location")]
    public string? Location { get; set; }

    [Name("xCordAdjusted")]
    public decimal? XCoordAdjusted { get; set; }

    [Name("yCordAdjusted")]
    public decimal? YCoordAdjusted { get; set; }

    [Name("arenaAdjustedXCord")]
    public decimal? ArenaAdjustedXCoord { get; set; }

    [Name("arenaAdjustedYCord")]
    public decimal? ArenaAdjustedYCoord { get; set; }

    [Name("arenaAdjustedXCordABS")]
    public decimal? ArenaAdjustedXCoordAbs { get; set; }

    [Name("arenaAdjustedYCordAbs")]
    public decimal? ArenaAdjustedYCoordAbs { get; set; }

    [Name("shotDistance")]
    public decimal? ShotDistance { get; set; }

    [Name("shotAngle")]
    public decimal? ShotAngle { get; set; }

    [Name("shotAngleAdjusted")]
    public decimal? ShotAngleAdjusted { get; set; }

    [Name("arenaAdjustedShotDistance")]
    public decimal? ArenaAdjustedShotDistance { get; set; }

    [Name("shotOnEmptyNet")]
    public decimal ShotOnEmptyNet { get; set; }

    [Name("shotRebound")]
    public decimal ShotRebound { get; set; }

    [Name("shotRush")]
    public decimal ShotRush { get; set; }

    [Name("offWing")]
    public decimal OffWing { get; set; }

    [Name("shotWasOnGoal")]
    public decimal ShotWasOnGoal { get; set; }

    [Name("shotPlayContinued")]
    public decimal? ShotPlayContinued { get; set; }

    [Name("shotPlayContinuedInZone")]
    public decimal ShotPlayContinuedInZone { get; set; }

    [Name("shotPlayContinuedOutsideZone")]
    public decimal ShotPlayContinuedOutsideZone { get; set; }

    [Name("shotGoalieFroze")]
    public decimal ShotGoalieFroze { get; set; }

    [Name("shotPlayStopped")]
    public decimal ShotPlayStopped { get; set; }

    [Name("shotGeneratedRebound")]
    public decimal ShotGeneratedRebound { get; set; }

    [Name("timeUntilNextEvent")]
    public decimal? TimeUntilNextEvent { get; set; }

    [Name("timeSinceLastEvent")]
    public decimal? TimeSinceLastEvent { get; set; }

    [Name("timeBetweenEvents")]
    public decimal? TimeBetweenEvents { get; set; }

    [Name("timeSinceFaceoff")]
    public decimal? TimeSinceFaceoff { get; set; }

    [Name("shooterTimeOnIce")]
    public decimal? ShooterTimeOnIce { get; set; }

    [Name("shooterTimeOnIceSinceFaceoff")]
    public decimal? ShooterTimeOnIceSinceFaceoff { get; set; }

    [Name("timeDifferenceSinceChange")]
    public decimal? TimeDifferenceSinceChange { get; set; }

    [Name("homeTeamGoals")]
    public decimal HomeTeamGoals { get; set; }

    [Name("awayTeamGoals")]
    public decimal AwayTeamGoals { get; set; }

    [Name("homeTeamScore")]
    public decimal? HomeTeamScore { get; set; }

    [Name("roadTeamScore")]
    public decimal? RoadTeamScore { get; set; }

    [Name("homeEmptyNet")]
    public decimal HomeEmptyNet { get; set; }

    [Name("awayEmptyNet")]
    public decimal AwayEmptyNet { get; set; }

    [Name("gameOver")]
    public decimal? GameOver { get; set; }

    [Name("wentToOT")]
    public decimal? WentToOT { get; set; }

    [Name("wentToShootout")]
    public decimal? WentToShootout { get; set; }

    [Name("homeWinProbability")]
    public decimal? HomeWinProbability { get; set; }

    [Name("homeSkatersOnIce")]
    public decimal HomeSkatersOnIce { get; set; }

    [Name("awaySkatersOnIce")]
    public decimal AwaySkatersOnIce { get; set; }

    [Name("shootingTeamForwardsOnIce")]
    public decimal ShootingTeamForwardsOnIce { get; set; }

    [Name("shootingTeamDefencemenOnIce")]
    public decimal ShootingTeamDefencemenOnIce { get; set; }

    [Name("defendingTeamForwardsOnIce")]
    public decimal DefendingTeamForwardsOnIce { get; set; }

    [Name("defendingTeamDefencemenOnIce")]
    public decimal DefendingTeamDefencemenOnIce { get; set; }

    [Name("shootingTeamAverageTimeOnIce")]
    public decimal? ShootingTeamAverageTimeOnIce { get; set; }

    [Name("shootingTeamMaxTimeOnIce")]
    public decimal? ShootingTeamMaxTimeOnIce { get; set; }

    [Name("shootingTeamMinTimeOnIce")]
    public decimal? ShootingTeamMinTimeOnIce { get; set; }

    [Name("shootingTeamAverageTimeOnIceOfForwards")]
    public decimal? ShootingTeamAverageTimeOnIceOfForwards { get; set; }

    [Name("shootingTeamMaxTimeOnIceOfForwards")]
    public decimal? ShootingTeamMaxTimeOnIceOfForwards { get; set; }

    [Name("shootingTeamMinTimeOnIceOfForwards")]
    public decimal? ShootingTeamMinTimeOnIceOfForwards { get; set; }

    [Name("shootingTeamAverageTimeOnIceOfDefencemen")]
    public decimal? ShootingTeamAverageTimeOnIceOfDefencemen { get; set; }

    [Name("shootingTeamMaxTimeOnIceOfDefencemen")]
    public decimal? ShootingTeamMaxTimeOnIceOfDefencemen { get; set; }

    [Name("shootingTeamMinTimeOnIceOfDefencemen")]
    public decimal? ShootingTeamMinTimeOnIceOfDefencemen { get; set; }

    [Name("shootingTeamAverageTimeOnIceSinceFaceoff")]
    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoff { get; set; }

    [Name("shootingTeamMaxTimeOnIceSinceFaceoff")]
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoff { get; set; }

    [Name("shootingTeamMinTimeOnIceSinceFaceoff")]
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoff { get; set; }

    [Name("shootingTeamAverageTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("shootingTeamMaxTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("shootingTeamMinTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("shootingTeamAverageTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? ShootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("shootingTeamMaxTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? ShootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("shootingTeamMinTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? ShootingTeamMinTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("defendingTeamAverageTimeOnIce")]
    public decimal? DefendingTeamAverageTimeOnIce { get; set; }

    [Name("defendingTeamMaxTimeOnIce")]
    public decimal? DefendingTeamMaxTimeOnIce { get; set; }

    [Name("defendingTeamMinTimeOnIce")]
    public decimal? DefendingTeamMinTimeOnIce { get; set; }

    [Name("defendingTeamAverageTimeOnIceOfForwards")]
    public decimal? DefendingTeamAverageTimeOnIceOfForwards { get; set; }

    [Name("defendingTeamMaxTimeOnIceOfForwards")]
    public decimal? DefendingTeamMaxTimeOnIceOfForwards { get; set; }

    [Name("defendingTeamMinTimeOnIceOfForwards")]
    public decimal? DefendingTeamMinTimeOnIceOfForwards { get; set; }

    [Name("defendingTeamAverageTimeOnIceOfDefencemen")]
    public decimal? DefendingTeamAverageTimeOnIceOfDefencemen { get; set; }

    [Name("defendingTeamMaxTimeOnIceOfDefencemen")]
    public decimal? DefendingTeamMaxTimeOnIceOfDefencemen { get; set; }

    [Name("defendingTeamMinTimeOnIceOfDefencemen")]
    public decimal? DefendingTeamMinTimeOnIceOfDefencemen { get; set; }

    [Name("defendingTeamAverageTimeOnIceSinceFaceoff")]
    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoff { get; set; }

    [Name("defendingTeamMaxTimeOnIceSinceFaceoff")]
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoff { get; set; }

    [Name("defendingTeamMinTimeOnIceSinceFaceoff")]
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoff { get; set; }

    [Name("defendingTeamAverageTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("defendingTeamMaxTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("defendingTeamMinTimeOnIceOfForwardsSinceFaceoff")]
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoffOfForwards { get; set; }

    [Name("defendingTeamAverageTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? DefendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("defendingTeamMaxTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? DefendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("defendingTeamMinTimeOnIceOfDefencemenSinceFaceoff")]
    public decimal? DefendingTeamMinTimeOnIceSinceFaceoffOfDefencemen { get; set; }

    [Name("awayPenalty1TimeLeft")]
    public decimal? AwayPenalty1TimeLeft { get; set; }

    [Name("awayPenalty1Length")]
    public decimal? AwayPenalty1Length { get; set; }

    [Name("homePenalty1TimeLeft")]
    public decimal? HomePenalty1TimeLeft { get; set; }

    [Name("homePenalty1Length")]
    public decimal? HomePenalty1Length { get; set; }

    [Name("penaltyLength")]
    public decimal? PenaltyLength { get; set; }

    [Name("lastEventxCord")]
    public decimal? LastEventXCoord { get; set; }

    [Name("lastEventyCord")]
    public decimal? LastEventYCoord { get; set; }

    [Name("lastEventxCord_adjusted")]
    public decimal? LastEventXCoordAdjusted { get; set; }

    [Name("lastEventyCord_adjusted")]
    public decimal? LastEventYCoordAdjusted { get; set; }

    [Name("lastEventShotAngle")]
    public decimal? LastEventShotAngle { get; set; }

    [Name("lastEventShotDistance")]
    public decimal? LastEventShotDistance { get; set; }

    [Name("lastEventCategory")]
    public string? LastEventCategory { get; set; }

    [Name("lastEventTeam")]
    public string? LastEventTeam { get; set; }

    [Name("distanceFromLastEvent")]
    public decimal? DistanceFromLastEvent { get; set; }

    [Name("speedFromLastEvent")]
    public decimal? SpeedFromLastEvent { get; set; }

    [Name("averageRestDifference")]
    public decimal? AverageRestDifference { get; set; }

    [Name("xGoal")]
    public decimal? XGoal { get; set; }

    [Name("xFroze")]
    public decimal? XFroze { get; set; }

    [Name("xRebound")]
    public decimal? XRebound { get; set; }

    [Name("xPlayContinuedInZone")]
    public decimal? XPlayContinuedInZone { get; set; }

    [Name("xPlayContinuedOutsideZone")]
    public decimal? XPlayContinuedOutsideZone { get; set; }

    [Name("xPlayStopped")]
    public decimal? XPlayStopped { get; set; }

    [Name("xShotWasOnGoal")]
    public decimal? XShotWasOnGoal { get; set; }

    [Name("shotGoalProbability")]
    public decimal? ShotGoalProbability { get; set; }

    [Name("shotAnglePlusRebound")]
    public decimal? ShotAnglePlusRebound { get; set; }

    [Name("shotAnglePlusReboundSpeed")]
    public decimal? ShotAnglePlusReboundSpeed { get; set; }

    [Name("shotAngleReboundRoyalRoad")]
    public decimal ShotAngleReboundRoyalRoad { get; set; }
}
