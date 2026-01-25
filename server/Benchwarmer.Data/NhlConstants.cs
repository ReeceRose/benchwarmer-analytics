namespace Benchwarmer.Data;

/// <summary>
/// NHL league constants and rules used across the application.
/// </summary>
public static class NhlConstants
{
    /// <summary>
    /// NHL rookie eligibility: a player loses rookie status after playing
    /// this many games in any prior season.
    /// </summary>
    public const int RookieMaxPriorGames = 26;

    /// <summary>
    /// NHL rookie eligibility: a player must be under this age as of
    /// September 15 of the season to maintain rookie status.
    /// </summary>
    public const int RookieMaxAge = 26;

    /// <summary>
    /// The month/day used for age calculations in NHL eligibility rules.
    /// Age is calculated as of September 15 of the season year.
    /// </summary>
    public const int AgeCalculationMonth = 9;
    public const int AgeCalculationDay = 15;
}
