namespace Benchwarmer.Api.Endpoints.Helpers;

public static class PlayerHelpers
{
    /// <summary>
    /// Builds the NHL headshot URL for a player based on their current team and season.
    /// Returns null if the player has no team (free agent, retired, etc.).
    /// </summary>
    public static string? BuildHeadshotUrl(int playerId, string? teamAbbreviation)
    {
        if (string.IsNullOrEmpty(teamAbbreviation))
            return null;

        // NHL season runs Oct-Jun. Before October, use previous year as season start.
        var now = DateTime.UtcNow;
        var seasonYear = now.Month < 10 ? now.Year - 1 : now.Year;
        var seasonId = $"{seasonYear}{seasonYear + 1}";

        return $"https://assets.nhle.com/mugs/nhl/{seasonId}/{teamAbbreviation}/{playerId}.png";
    }

    /// <summary>
    /// Gets the headshot URL for a player, using stored URL if available or generating one.
    /// </summary>
    public static string? GetHeadshotUrl(int playerId, string? storedUrl, string? teamAbbreviation)
    {
        return storedUrl ?? BuildHeadshotUrl(playerId, teamAbbreviation);
    }
}
