namespace Benchwarmer.Data;

/// <summary>
/// Constants and helpers for NHL game state and type values.
/// </summary>
public static class GameState
{
    // Game states from NHL API
    public const string Future = "FUT";
    public const string PreGame = "PRE";
    public const string Live = "LIVE";
    public const string Critical = "CRIT";
    public const string Final = "OFF";
    public const string FinalAlt = "FINAL";

    // Game types from NHL API
    public const int Preseason = 1;
    public const int RegularSeason = 2;
    public const int Playoffs = 3;
    public const int AllStar = 4;

    /// <summary>
    /// Check if a game is completed. Handles stale data by also checking
    /// if the game is in the past with scores.
    /// </summary>
    public static bool IsCompleted(string? gameState, DateOnly gameDate, int homeScore, int awayScore)
    {
        if (gameState == Final || gameState == FinalAlt)
            return true;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (gameDate < today && (homeScore > 0 || awayScore > 0))
            return true;

        return false;
    }

    /// <summary>
    /// Check if a game is currently live.
    /// </summary>
    public static bool IsLive(string? gameState) =>
        gameState == Live || gameState == Critical;

    /// <summary>
    /// Check if a game is scheduled (not started).
    /// </summary>
    public static bool IsScheduled(string? gameState) =>
        gameState == Future || gameState == PreGame;

    /// <summary>
    /// Check if game state indicates final (handles both "OFF" and "FINAL" values).
    /// </summary>
    public static bool IsFinal(string? gameState) =>
        gameState == Final || gameState == FinalAlt;
}
