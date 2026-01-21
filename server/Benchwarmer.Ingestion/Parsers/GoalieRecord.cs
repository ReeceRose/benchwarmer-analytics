using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class GoalieRecord
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

    [Name("xGoals")]
    public decimal? ExpectedGoalsAgainst { get; set; }

    [Name("goals")]
    public decimal? GoalsAgainst { get; set; }

    [Name("ongoal")]
    public decimal? ShotsAgainst { get; set; }

    [Name("lowDangerShots")]
    public decimal? LowDangerShots { get; set; }

    [Name("mediumDangerShots")]
    public decimal? MediumDangerShots { get; set; }

    [Name("highDangerShots")]
    public decimal? HighDangerShots { get; set; }

    [Name("lowDangerGoals")]
    public decimal? LowDangerGoals { get; set; }

    [Name("mediumDangerGoals")]
    public decimal? MediumDangerGoals { get; set; }

    [Name("highDangerGoals")]
    public decimal? HighDangerGoals { get; set; }

    [Name("xRebounds")]
    public decimal? ExpectedRebounds { get; set; }

    [Name("rebounds")]
    public decimal? Rebounds { get; set; }

    [Name("penalityMinutes")]
    public decimal? PenaltyMinutes { get; set; }
}
