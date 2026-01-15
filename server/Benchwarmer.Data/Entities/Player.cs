namespace Benchwarmer.Data.Entities;

public class Player
{
    public int Id { get; set; }                        // MoneyPuck player ID
    public required string Name { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Position { get; set; }              // C, LW, RW, D, G
    public string? CurrentTeamAbbreviation { get; set; }
    public string? HeadshotUrl { get; set; }
    public DateOnly? BirthDate { get; set; }
    public int? HeightInches { get; set; }
    public int? WeightLbs { get; set; }
    public string? Shoots { get; set; }                // L, R
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}