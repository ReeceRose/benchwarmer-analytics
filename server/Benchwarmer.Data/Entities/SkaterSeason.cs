namespace Benchwarmer.Data.Entities;

public class SkaterSeason
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
    public int Goals { get; set; }
    public int Assists { get; set; }
    public int Shots { get; set; }

    // Advanced stats
    public decimal? ExpectedGoals { get; set; }
    public decimal? ExpectedGoalsPer60 { get; set; }
    public decimal? OnIceShootingPct { get; set; }
    public decimal? OnIceSavePct { get; set; }
    public decimal? CorsiForPct { get; set; }
    public decimal? FenwickForPct { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Player? Player { get; set; }
}