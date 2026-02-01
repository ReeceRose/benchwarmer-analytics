namespace Benchwarmer.Data;

/// <summary>
/// Centralized definitions for leaderboard stat categories.
/// </summary>
public static class LeaderboardCategories
{
    /// <summary>
    /// Skater stat categories.
    /// </summary>
    public static readonly string[] Skater =
        ["points", "goals", "assists", "shots", "expectedgoals", "xgper60", "corsipct", "fenwickpct", "oishpct", "oisvpct", "icetime", "gamesplayed", "faceoffpct"];

    /// <summary>
    /// Goalie stat categories (always use "all" situation).
    /// </summary>
    public static readonly string[] Goalie =
        ["savepct", "gaa", "gsax", "shotsagainst", "goalietime", "goalsagainst", "xga", "reboundcontrol"];

    /// <summary>
    /// Checks if the category is valid.
    /// </summary>
    public static bool IsValid(string category)
    {
        var normalized = category.ToLowerInvariant();
        return Skater.Contains(normalized) || Goalie.Contains(normalized);
    }

    /// <summary>
    /// Checks if the category is a goalie stat.
    /// </summary>
    public static bool IsGoalieCategory(string category)
    {
        return Goalie.Contains(category.ToLowerInvariant());
    }
}
