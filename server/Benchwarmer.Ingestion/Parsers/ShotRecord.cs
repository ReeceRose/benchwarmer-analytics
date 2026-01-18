using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class ShotRecord
{
    [Name("shotID")]
    public string ShotId { get; set; } = "";

    [Name("game_id")]
    public string GameId { get; set; } = "";

    [Name("id")]
    public int EventId { get; set; }

    [Name("season")]
    public int Season { get; set; }

    [Name("isPlayoffGame")]
    public int IsPlayoffGame { get; set; }

    [Name("playoffGame")]
    public int PlayoffGame { get; set; }

    [Name("homeTeamCode")]
    public string HomeTeamCode { get; set; } = "";

    [Name("awayTeamCode")]
    public string AwayTeamCode { get; set; } = "";

    [Name("roadTeamCode")]
    public string RoadTeamCode { get; set; } = "";

    [Name("team")]
    public string Team { get; set; } = "";

    [Name("teamCode")]
    public string TeamCode { get; set; } = "";

    [Name("isHomeTeam")]
    public int IsHomeTeam { get; set; }

    [Name("homeTeamWon")]
    public int HomeTeamWon { get; set; }

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
    public int Goal { get; set; }

    [Name("shotType")]
    public string? ShotType { get; set; }

    [Name("period")]
    public int Period { get; set; }

    [Name("time")]
    public int GameTimeSeconds { get; set; }

    [Name("timeLeft")]
    public int? TimeLeft { get; set; }

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
    public int ShotOnEmptyNet { get; set; }

    [Name("shotRebound")]
    public int ShotRebound { get; set; }

    [Name("shotRush")]
    public int ShotRush { get; set; }

    [Name("offWing")]
    public int OffWing { get; set; }

    [Name("shotWasOnGoal")]
    public int ShotWasOnGoal { get; set; }

    [Name("shotPlayContinued")]
    public int ShotPlayContinued { get; set; }

    [Name("shotPlayContinuedInZone")]
    public int ShotPlayContinuedInZone { get; set; }

    [Name("shotPlayContinuedOutsideZone")]
    public int ShotPlayContinuedOutsideZone { get; set; }

    [Name("shotGoalieFroze")]
    public int ShotGoalieFroze { get; set; }

    [Name("shotPlayStopped")]
    public int ShotPlayStopped { get; set; }

    [Name("shotGeneratedRebound")]
    public int ShotGeneratedRebound { get; set; }

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
    public int HomeTeamGoals { get; set; }

    [Name("awayTeamGoals")]
    public int AwayTeamGoals { get; set; }

    [Name("homeTeamScore")]
    public int? HomeTeamScore { get; set; }

    [Name("roadTeamScore")]
    public int? RoadTeamScore { get; set; }

    [Name("homeEmptyNet")]
    public int HomeEmptyNet { get; set; }

    [Name("awayEmptyNet")]
    public int AwayEmptyNet { get; set; }

    [Name("gameOver")]
    public int? GameOver { get; set; }

    [Name("wentToOT")]
    public int? WentToOT { get; set; }

    [Name("wentToShootout")]
    public int? WentToShootout { get; set; }

    [Name("homeWinProbability")]
    public decimal? HomeWinProbability { get; set; }

    [Name("homeSkatersOnIce")]
    public int HomeSkatersOnIce { get; set; }

    [Name("awaySkatersOnIce")]
    public int AwaySkatersOnIce { get; set; }

    [Name("shootingTeamForwardsOnIce")]
    public int ShootingTeamForwardsOnIce { get; set; }

    [Name("shootingTeamDefencemenOnIce")]
    public int ShootingTeamDefencemenOnIce { get; set; }

    [Name("defendingTeamForwardsOnIce")]
    public int DefendingTeamForwardsOnIce { get; set; }

    [Name("defendingTeamDefencemenOnIce")]
    public int DefendingTeamDefencemenOnIce { get; set; }

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
    public int ShotAngleReboundRoyalRoad { get; set; }
}
