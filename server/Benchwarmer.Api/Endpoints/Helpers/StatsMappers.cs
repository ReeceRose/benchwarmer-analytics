using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for stats-related calculations.
/// </summary>
public static class StatsMappers
{
    // Rookie score calculation constants
    private const decimal DefensemanProductionMultiplier = 1.3m;
    private const decimal ForwardProductionMultiplier = 1.0m;
    private const int BaselineRookieAge = 22;
    private const decimal AgeAdjustmentPerYear = 2m;
    private const decimal PointsWeight = 2m;
    private const decimal XgDiffWeight = 1.5m;
    private const decimal CorsiDivisor = 5m;
    private const decimal ShotRateDivisor = 3m;
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

    /// <summary>
    /// Calculate a rookie score based on production, underlying metrics, position, and age.
    /// - Defensemen get 1.3x multiplier on production metrics (they score less than forwards)
    /// - Age adjustment: +2 points per year younger than 22, -2 per year older
    /// </summary>
    public static decimal CalculateRookieScore(SkaterSeason stats, string? position, int age)
    {
        var points = stats.Goals + stats.Assists;
        var xgDiff = stats.Goals - (stats.ExpectedGoals ?? 0);
        var corsiBonus = ((stats.CorsiForPct ?? 50) - 50) / CorsiDivisor;
        var shotRate = stats.IceTimeSeconds > 0
            ? (decimal)stats.Shots / stats.IceTimeSeconds * 3600
            : 0;
        var shotBonus = shotRate / ShotRateDivisor;

        // Defensemen get a boost on production metrics since they naturally score less
        var positionMultiplier = position == "D"
            ? DefensemanProductionMultiplier
            : ForwardProductionMultiplier;

        // Age bonus: younger rookies are more impressive, baseline age is 22
        // 18-year-old: +8 points, 20-year-old: +4, 22: 0, 25: -6
        var ageBonus = (BaselineRookieAge - age) * AgeAdjustmentPerYear;

        var productionScore = (points * PointsWeight * positionMultiplier)
            + (xgDiff * XgDiffWeight * positionMultiplier);
        var underlyingScore = corsiBonus + shotBonus;

        return Math.Round(productionScore + underlyingScore + ageBonus, 2);
    }

    /// <summary>
    /// Calculate player age as of September 15 of the given season year.
    /// </summary>
    public static int CalculateAgeAsSept15(DateOnly birthDate, int seasonYear)
    {
        var sept15 = new DateOnly(seasonYear, 9, 15);
        var age = seasonYear - birthDate.Year;
        if (birthDate > sept15.AddYears(-age))
            age--;
        return age;
    }
}
