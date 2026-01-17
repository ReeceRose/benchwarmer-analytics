namespace Benchwarmer.Data.Entities;

/// <summary>
/// Read-only entity mapped to the chemistry_pairs materialized view.
/// Represents pre-aggregated statistics for player pairs who have shared ice time.
/// </summary>
public class ChemistryPairView
{
    public int Player1Id { get; set; }
    public int Player2Id { get; set; }
    public string Player1Name { get; set; } = "";
    public string Player2Name { get; set; } = "";
    public string Team { get; set; } = "";
    public int Season { get; set; }
    public string Situation { get; set; } = "";
    public long TotalIceTimeSeconds { get; set; }
    public int GamesPlayed { get; set; }
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public decimal XGoalsFor { get; set; }
    public decimal XGoalsAgainst { get; set; }
    public int CorsiFor { get; set; }
    public int CorsiAgainst { get; set; }
}
