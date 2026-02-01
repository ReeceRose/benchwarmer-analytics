namespace Benchwarmer.Data.Constants;

public static class MoneyPuckDangerZones
{
    // MoneyPuck danger zones (xG probability on unblocked shot attempts):
    // Low: < 0.08, Medium: >= 0.08 and < 0.20, High: >= 0.20
    public const decimal MediumThreshold = 0.08m;
    public const decimal HighThreshold = 0.20m;
}

