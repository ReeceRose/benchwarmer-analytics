namespace Benchwarmer.Data.Entities;

public class Game
{
    public int Id { get; set; }
    public required string GameId { get; set; }
    public int Season { get; set; }
    public int GameType { get; set; }
    public DateOnly GameDate { get; set; }
    public required string HomeTeamCode { get; set; }
    public required string AwayTeamCode { get; set; }
    public int HomeScore { get; set; }
    public int AwayScore { get; set; }
    public required string GameState { get; set; }
    public string? PeriodType { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
