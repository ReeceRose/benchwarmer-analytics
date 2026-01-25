namespace Benchwarmer.Data.Entities;

/// <summary>
/// Read-only entity mapped to the season_percentiles materialized view.
/// Stores pre-computed percentile thresholds for skater stats per season.
/// </summary>
public class SeasonPercentileView
{
    public int Season { get; set; }
    public int PlayerCount { get; set; }
    public int Percentile { get; set; }
    public decimal PointsPerGame { get; set; }
    public decimal GoalsPerGame { get; set; }
    public decimal PointsPer60 { get; set; }
    public decimal GoalsPer60 { get; set; }
}
