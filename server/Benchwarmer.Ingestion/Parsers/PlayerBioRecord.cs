using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class PlayerBioRecord
{
    [Name("playerId")]
    public int PlayerId { get; set; }

    [Name("name")]
    public string Name { get; set; } = "";

    [Name("position")]
    public string? Position { get; set; }

    [Name("team")]
    public string? Team { get; set; }

    [Name("birthDate")]
    public string? BirthDate { get; set; }

    [Name("weight")]
    public decimal? WeightLbs { get; set; }

    [Name("height")]
    public string? Height { get; set; }  // "6' 3\"" format

    [Name("nationality")]
    public string? Nationality { get; set; }

    [Name("shootsCatches")]
    public string? Shoots { get; set; }

    [Name("primaryNumber")]
    public int? JerseyNumber { get; set; }

    [Name("primaryPosition")]
    public string? PrimaryPosition { get; set; }
}
