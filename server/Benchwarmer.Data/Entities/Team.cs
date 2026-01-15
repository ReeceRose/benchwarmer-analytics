namespace Benchwarmer.Data.Entities;

public class Team
{
    public int Id { get; set; }
    public required string Abbreviation { get; set; }  // "TOR", "MTL", etc.
    public required string Name { get; set; }          // "Toronto Maple Leafs"
    public string? Division { get; set; }
    public string? Conference { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}