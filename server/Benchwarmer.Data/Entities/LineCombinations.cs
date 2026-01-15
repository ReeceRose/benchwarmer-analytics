namespace Benchwarmer.Data.Entities;

public class LineCombination
{
    public int Id { get; set; }
    public int Season { get; set; }
    public required string Team { get; set; }
    public required string Situation { get; set; }

    // Player IDs (nullable Player3 for D pairs)
    public int Player1Id { get; set; }
    public int Player2Id { get; set; }
    public int? Player3Id { get; set; }

    // Time together
    public int IceTimeSeconds { get; set; }
    public int GamesPlayed { get; set; }

    // Results
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public decimal? ExpectedGoalsFor { get; set; }
    public decimal? ExpectedGoalsAgainst { get; set; }
    public decimal? ExpectedGoalsPct { get; set; }

    // Possession
    public int CorsiFor { get; set; }
    public int CorsiAgainst { get; set; }
    public decimal? CorsiPct { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Player? Player1 { get; set; }
    public Player? Player2 { get; set; }
    public Player? Player3 { get; set; }
}