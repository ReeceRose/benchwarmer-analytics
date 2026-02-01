namespace Benchwarmer.Data.Entities;

public class GameScoreStateTime
{
    public int Id { get; set; }
    public required string GameId { get; set; }
    public required string TeamAbbreviation { get; set; }
    public int Season { get; set; }
    public bool IsPlayoffs { get; set; }
    public int LeadingSeconds { get; set; }
    public int TrailingSeconds { get; set; }
    public int TiedSeconds { get; set; }
    public DateTime CalculatedAt { get; set; }
}
