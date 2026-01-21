namespace Benchwarmer.Data.Entities;

public class GoalieSeason
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public int Season { get; set; }                    // 2024 = 2024-25 season
    public required string Team { get; set; }
    public required string Situation { get; set; }     // "all", "5on5", "5on4", etc.
    public bool IsPlayoffs { get; set; }               // true for playoffs, false for regular season

    // Basic stats
    public int GamesPlayed { get; set; }
    public int IceTimeSeconds { get; set; }

    // Goals against stats
    public int GoalsAgainst { get; set; }
    public int ShotsAgainst { get; set; }
    public decimal? ExpectedGoalsAgainst { get; set; }

    // Derived stats (computed on insert/update)
    public decimal? SavePercentage { get; set; }          // (ShotsAgainst - GoalsAgainst) / ShotsAgainst
    public decimal? GoalsAgainstAverage { get; set; }     // GoalsAgainst / (IceTimeSeconds / 3600) * 60
    public decimal? GoalsSavedAboveExpected { get; set; } // ExpectedGoalsAgainst - GoalsAgainst

    // Danger zone stats
    public int LowDangerShots { get; set; }
    public int MediumDangerShots { get; set; }
    public int HighDangerShots { get; set; }
    public int LowDangerGoals { get; set; }
    public int MediumDangerGoals { get; set; }
    public int HighDangerGoals { get; set; }

    // Rebound stats
    public decimal? ExpectedRebounds { get; set; }
    public int Rebounds { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Player? Player { get; set; }
}
