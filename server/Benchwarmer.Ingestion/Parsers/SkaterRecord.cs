using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class SkaterRecord
{
  [Name("playerId")]
  public int PlayerId { get; set; }

  [Name("name")]
  public string Name { get; set; } = "";

  [Name("team")]
  public string Team { get; set; } = "";

  [Name("season")]
  public int Season { get; set; }

  [Name("situation")]
  public string Situation { get; set; } = "";

  [Name("games_played")]
  public int GamesPlayed { get; set; }

  [Name("icetime")]
  public decimal IceTime { get; set; }

  [Name("I_F_goals")]
  public decimal Goals { get; set; }

  [Name("I_F_primaryAssists")]
  public decimal PrimaryAssists { get; set; }

  [Name("I_F_secondaryAssists")]
  public decimal SecondaryAssists { get; set; }

  [Name("I_F_shotsOnGoal")]
  public decimal Shots { get; set; }

  [Name("I_F_xGoals")]
  public decimal? ExpectedGoals { get; set; }

  [Name("onIce_corsiPercentage")]
  public decimal? CorsiPct { get; set; }

  [Name("onIce_fenwickPercentage")]
  public decimal? FenwickPct { get; set; }
}