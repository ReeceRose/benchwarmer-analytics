using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for stats-related calculations.
/// </summary>
public static class StatsMappers
{
    /// <summary>
    /// Calculate a breakout score for a player based on underlying metrics.
    /// Higher score = more likely to break out (shooting below expected with good process).
    /// </summary>
    public static decimal CalculateBreakoutScore(SkaterSeason stats)
    {
        // Breakout score: combination of xG differential, CF%, and shot rate
        var xgDiff = (stats.ExpectedGoals ?? 0) - stats.Goals;
        var corsiBonus = ((stats.CorsiForPct ?? 50) - 50) / 10; // +/- based on CF%
        var shotRate = stats.IceTimeSeconds > 0
            ? (decimal)stats.Shots / stats.IceTimeSeconds * 3600
            : 0;
        var shotBonus = (shotRate - 7) / 3; // Average shot rate ~7/60, bonus/penalty

        return Math.Round(xgDiff + corsiBonus + shotBonus, 2);
    }

    /// <summary>
    /// Get the default season based on current date.
    /// Returns current year if October or later, otherwise previous year.
    /// </summary>
    public static int GetDefaultSeason()
    {
        var now = DateTime.Now;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
