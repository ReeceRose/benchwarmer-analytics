namespace Benchwarmer.Ingestion;

/// <summary>
/// Normalizes team abbreviations to a canonical format.
/// MoneyPuck uses period-separated abbreviations (L.A, N.J, S.J, T.B)
/// while standard NHL abbreviations use 3 letters (LAK, NJD, SJS, TBL).
/// This normalizer converts to the standard NHL format.
/// </summary>
public static class TeamAbbreviationNormalizer
{
    private static readonly Dictionary<string, string> AbbreviationMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // MoneyPuck format -> Standard NHL format
        ["L.A"] = "LAK",
        ["N.J"] = "NJD",
        ["S.J"] = "SJS",
        ["T.B"] = "TBL",
    };

    /// <summary>
    /// Normalizes a team abbreviation to its canonical form.
    /// </summary>
    /// <param name="abbreviation">The abbreviation to normalize</param>
    /// <returns>The normalized abbreviation</returns>
    public static string Normalize(string abbreviation)
    {
        if (string.IsNullOrWhiteSpace(abbreviation))
            return abbreviation;

        return AbbreviationMap.TryGetValue(abbreviation, out var normalized)
            ? normalized
            : abbreviation;
    }

    /// <summary>
    /// Normalizes a nullable team abbreviation to its canonical form.
    /// </summary>
    /// <param name="abbreviation">The abbreviation to normalize (may be null)</param>
    /// <returns>The normalized abbreviation, or null if input was null</returns>
    public static string? NormalizeOrNull(string? abbreviation)
    {
        if (string.IsNullOrWhiteSpace(abbreviation))
            return abbreviation;

        return AbbreviationMap.TryGetValue(abbreviation, out var normalized)
            ? normalized
            : abbreviation;
    }

    /// <summary>
    /// Checks if an abbreviation needs normalization.
    /// </summary>
    public static bool NeedsNormalization(string abbreviation)
    {
        return !string.IsNullOrWhiteSpace(abbreviation) &&
               AbbreviationMap.ContainsKey(abbreviation);
    }
}
