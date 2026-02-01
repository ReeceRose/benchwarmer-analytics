using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Constants;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for shot-related DTO mapping and calculations.
/// </summary>
public static class ShotMappers
{
    public static readonly string[] ValidShotTypes = ["WRIST", "SLAP", "SNAP", "BACKHAND", "TIP", "WRAP", "DEFLECTED"];
    public static readonly string[] ValidScoreStates = ["leading", "trailing", "tied"];

    public static ShotDto MapToDto(Shot shot)
    {
        return new ShotDto(
            shot.ShotId,
            shot.ShooterPlayerId,
            shot.ShooterName,
            shot.ShooterPosition,
            shot.Period,
            shot.GameTimeSeconds,
            shot.ArenaAdjustedXCoord,
            shot.ArenaAdjustedYCoord,
            shot.ShotDistance,
            shot.ShotAngle,
            shot.ShotType,
            shot.IsGoal,
            shot.ShotWasOnGoal,
            shot.ShotOnEmptyNet,
            shot.ShotRebound,
            shot.ShotRush,
            shot.XGoal,
            shot.HomeSkatersOnIce,
            shot.AwaySkatersOnIce,
            shot.GameId
        );
    }

    public static List<ShotDto> MapToDto(IEnumerable<Shot> shots)
    {
        return shots.Select(MapToDto).ToList();
    }

    public static ShotSummaryDto CalculateSummary(IReadOnlyList<Shot> shots)
    {
        var totalShots = shots.Count;
        var goals = shots.Count(s => s.IsGoal);
        var shotsOnGoal = shots.Count(s => s.ShotWasOnGoal);
        var shootingPct = totalShots > 0 ? Math.Round((decimal)goals / totalShots * 100, 1) : 0;
        var totalXGoal = shots.Sum(s => s.XGoal ?? 0);
        var goalsAboveExpected = Math.Round(goals - totalXGoal, 2);

        // Danger classification based on xG thresholds
        var highDanger = shots.Count(s => (s.XGoal ?? 0) >= MoneyPuckDangerZones.HighThreshold);
        var mediumDanger = shots.Count(s =>
        {
            var xg = s.XGoal ?? 0;
            return xg >= MoneyPuckDangerZones.MediumThreshold && xg < MoneyPuckDangerZones.HighThreshold;
        });
        var lowDanger = shots.Count(s => (s.XGoal ?? 0) < MoneyPuckDangerZones.MediumThreshold);

        return new ShotSummaryDto(
            totalShots,
            goals,
            shotsOnGoal,
            shootingPct,
            Math.Round(totalXGoal, 2),
            goalsAboveExpected,
            highDanger,
            mediumDanger,
            lowDanger
        );
    }

    public static ShooterStatsDto CalculateShooterStats(
        int playerId,
        string name,
        string? position,
        IEnumerable<Shot> shots)
    {
        var shotList = shots.ToList();
        var shotCount = shotList.Count;
        var goalCount = shotList.Count(s => s.IsGoal);
        var totalXGoal = shotList.Sum(s => s.XGoal ?? 0);

        return new ShooterStatsDto(
            playerId,
            name,
            position,
            shotCount,
            goalCount,
            shotCount > 0 ? Math.Round((decimal)goalCount / shotCount * 100, 1) : 0,
            Math.Round(totalXGoal, 2),
            Math.Round(goalCount - totalXGoal, 2)
        );
    }
}
