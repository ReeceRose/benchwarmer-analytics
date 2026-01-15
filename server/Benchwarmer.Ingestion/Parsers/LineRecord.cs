using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class LineRecord
{
  [Name("lineId")]
  public string LineId { get; set; } = "";

  [Name("season")]
  public int Season { get; set; }

  [Name("name")]
  public string Name { get; set; } = "";

  [Name("team")]
  public string Team { get; set; } = "";

  [Name("position")]
  public string Position { get; set; } = "";

  [Name("situation")]
  public string Situation { get; set; } = "";

  [Name("games_played")]
  public int GamesPlayed { get; set; }

  [Name("icetime")]
  public double IceTime { get; set; }

  [Name("iceTimeRank")]
  public double IceTimeRank { get; set; }

  [Name("xGoalsPercentage")]
  public double XGoalsPercentage { get; set; }

  [Name("corsiPercentage")]
  public double CorsiPercentage { get; set; }

  [Name("fenwickPercentage")]
  public double FenwickPercentage { get; set; }

  // For stats
  [Name("xOnGoalFor")]
  public double XOnGoalFor { get; set; }

  [Name("xGoalsFor")]
  public double XGoalsFor { get; set; }

  [Name("xReboundsFor")]
  public double XReboundsFor { get; set; }

  [Name("xFreezeFor")]
  public double XFreezeFor { get; set; }

  [Name("xPlayStoppedFor")]
  public double XPlayStoppedFor { get; set; }

  [Name("xPlayContinuedInZoneFor")]
  public double XPlayContinuedInZoneFor { get; set; }

  [Name("xPlayContinuedOutsideZoneFor")]
  public double XPlayContinuedOutsideZoneFor { get; set; }

  [Name("flurryAdjustedxGoalsFor")]
  public double FlurryAdjustedXGoalsFor { get; set; }

  [Name("scoreVenueAdjustedxGoalsFor")]
  public double ScoreVenueAdjustedXGoalsFor { get; set; }

  [Name("flurryScoreVenueAdjustedxGoalsFor")]
  public double FlurryScoreVenueAdjustedXGoalsFor { get; set; }

  [Name("shotsOnGoalFor")]
  public double ShotsOnGoalFor { get; set; }

  [Name("missedShotsFor")]
  public double MissedShotsFor { get; set; }

  [Name("blockedShotAttemptsFor")]
  public double BlockedShotAttemptsFor { get; set; }

  [Name("shotAttemptsFor")]
  public double ShotAttemptsFor { get; set; }

  [Name("goalsFor")]
  public double GoalsFor { get; set; }

  [Name("reboundsFor")]
  public double ReboundsFor { get; set; }

  [Name("reboundGoalsFor")]
  public double ReboundGoalsFor { get; set; }

  [Name("freezeFor")]
  public double FreezeFor { get; set; }

  [Name("playStoppedFor")]
  public double PlayStoppedFor { get; set; }

  [Name("playContinuedInZoneFor")]
  public double PlayContinuedInZoneFor { get; set; }

  [Name("playContinuedOutsideZoneFor")]
  public double PlayContinuedOutsideZoneFor { get; set; }

  [Name("savedShotsOnGoalFor")]
  public double SavedShotsOnGoalFor { get; set; }

  [Name("savedUnblockedShotAttemptsFor")]
  public double SavedUnblockedShotAttemptsFor { get; set; }

  [Name("penaltiesFor")]
  public double PenaltiesFor { get; set; }

  [Name("penalityMinutesFor")]
  public double PenaltyMinutesFor { get; set; }

  [Name("faceOffsWonFor")]
  public double FaceOffsWonFor { get; set; }

  [Name("hitsFor")]
  public double HitsFor { get; set; }

  [Name("takeawaysFor")]
  public double TakeawaysFor { get; set; }

  [Name("giveawaysFor")]
  public double GiveawaysFor { get; set; }

  [Name("lowDangerShotsFor")]
  public double LowDangerShotsFor { get; set; }

  [Name("mediumDangerShotsFor")]
  public double MediumDangerShotsFor { get; set; }

  [Name("highDangerShotsFor")]
  public double HighDangerShotsFor { get; set; }

  [Name("lowDangerxGoalsFor")]
  public double LowDangerXGoalsFor { get; set; }

  [Name("mediumDangerxGoalsFor")]
  public double MediumDangerXGoalsFor { get; set; }

  [Name("highDangerxGoalsFor")]
  public double HighDangerXGoalsFor { get; set; }

  [Name("lowDangerGoalsFor")]
  public double LowDangerGoalsFor { get; set; }

  [Name("mediumDangerGoalsFor")]
  public double MediumDangerGoalsFor { get; set; }

  [Name("highDangerGoalsFor")]
  public double HighDangerGoalsFor { get; set; }

  [Name("scoreAdjustedShotsAttemptsFor")]
  public double ScoreAdjustedShotAttemptsFor { get; set; }

  [Name("unblockedShotAttemptsFor")]
  public double UnblockedShotAttemptsFor { get; set; }

  [Name("scoreAdjustedUnblockedShotAttemptsFor")]
  public double ScoreAdjustedUnblockedShotAttemptsFor { get; set; }

  [Name("dZoneGiveawaysFor")]
  public double DZoneGiveawaysFor { get; set; }

  [Name("xGoalsFromxReboundsOfShotsFor")]
  public double XGoalsFromXReboundsOfShotsFor { get; set; }

  [Name("xGoalsFromActualReboundsOfShotsFor")]
  public double XGoalsFromActualReboundsOfShotsFor { get; set; }

  [Name("reboundxGoalsFor")]
  public double ReboundXGoalsFor { get; set; }

  [Name("totalShotCreditFor")]
  public double TotalShotCreditFor { get; set; }

  [Name("scoreAdjustedTotalShotCreditFor")]
  public double ScoreAdjustedTotalShotCreditFor { get; set; }

  [Name("scoreFlurryAdjustedTotalShotCreditFor")]
  public double ScoreFlurryAdjustedTotalShotCreditFor { get; set; }

  // Against stats
  [Name("xOnGoalAgainst")]
  public double XOnGoalAgainst { get; set; }

  [Name("xGoalsAgainst")]
  public double XGoalsAgainst { get; set; }

  [Name("xReboundsAgainst")]
  public double XReboundsAgainst { get; set; }

  [Name("xFreezeAgainst")]
  public double XFreezeAgainst { get; set; }

  [Name("xPlayStoppedAgainst")]
  public double XPlayStoppedAgainst { get; set; }

  [Name("xPlayContinuedInZoneAgainst")]
  public double XPlayContinuedInZoneAgainst { get; set; }

  [Name("xPlayContinuedOutsideZoneAgainst")]
  public double XPlayContinuedOutsideZoneAgainst { get; set; }

  [Name("flurryAdjustedxGoalsAgainst")]
  public double FlurryAdjustedXGoalsAgainst { get; set; }

  [Name("scoreVenueAdjustedxGoalsAgainst")]
  public double ScoreVenueAdjustedXGoalsAgainst { get; set; }

  [Name("flurryScoreVenueAdjustedxGoalsAgainst")]
  public double FlurryScoreVenueAdjustedXGoalsAgainst { get; set; }

  [Name("shotsOnGoalAgainst")]
  public double ShotsOnGoalAgainst { get; set; }

  [Name("missedShotsAgainst")]
  public double MissedShotsAgainst { get; set; }

  [Name("blockedShotAttemptsAgainst")]
  public double BlockedShotAttemptsAgainst { get; set; }

  [Name("shotAttemptsAgainst")]
  public double ShotAttemptsAgainst { get; set; }

  [Name("goalsAgainst")]
  public double GoalsAgainst { get; set; }

  [Name("reboundsAgainst")]
  public double ReboundsAgainst { get; set; }

  [Name("reboundGoalsAgainst")]
  public double ReboundGoalsAgainst { get; set; }

  [Name("freezeAgainst")]
  public double FreezeAgainst { get; set; }

  [Name("playStoppedAgainst")]
  public double PlayStoppedAgainst { get; set; }

  [Name("playContinuedInZoneAgainst")]
  public double PlayContinuedInZoneAgainst { get; set; }

  [Name("playContinuedOutsideZoneAgainst")]
  public double PlayContinuedOutsideZoneAgainst { get; set; }

  [Name("savedShotsOnGoalAgainst")]
  public double SavedShotsOnGoalAgainst { get; set; }

  [Name("savedUnblockedShotAttemptsAgainst")]
  public double SavedUnblockedShotAttemptsAgainst { get; set; }

  [Name("penaltiesAgainst")]
  public double PenaltiesAgainst { get; set; }

  [Name("penalityMinutesAgainst")]
  public double PenaltyMinutesAgainst { get; set; }

  [Name("faceOffsWonAgainst")]
  public double FaceOffsWonAgainst { get; set; }

  [Name("hitsAgainst")]
  public double HitsAgainst { get; set; }

  [Name("takeawaysAgainst")]
  public double TakeawaysAgainst { get; set; }

  [Name("giveawaysAgainst")]
  public double GiveawaysAgainst { get; set; }

  [Name("lowDangerShotsAgainst")]
  public double LowDangerShotsAgainst { get; set; }

  [Name("mediumDangerShotsAgainst")]
  public double MediumDangerShotsAgainst { get; set; }

  [Name("highDangerShotsAgainst")]
  public double HighDangerShotsAgainst { get; set; }

  [Name("lowDangerxGoalsAgainst")]
  public double LowDangerXGoalsAgainst { get; set; }

  [Name("mediumDangerxGoalsAgainst")]
  public double MediumDangerXGoalsAgainst { get; set; }

  [Name("highDangerxGoalsAgainst")]
  public double HighDangerXGoalsAgainst { get; set; }

  [Name("lowDangerGoalsAgainst")]
  public double LowDangerGoalsAgainst { get; set; }

  [Name("mediumDangerGoalsAgainst")]
  public double MediumDangerGoalsAgainst { get; set; }

  [Name("highDangerGoalsAgainst")]
  public double HighDangerGoalsAgainst { get; set; }

  [Name("scoreAdjustedShotsAttemptsAgainst")]
  public double ScoreAdjustedShotAttemptsAgainst { get; set; }

  [Name("unblockedShotAttemptsAgainst")]
  public double UnblockedShotAttemptsAgainst { get; set; }

  [Name("scoreAdjustedUnblockedShotAttemptsAgainst")]
  public double ScoreAdjustedUnblockedShotAttemptsAgainst { get; set; }

  [Name("dZoneGiveawaysAgainst")]
  public double DZoneGiveawaysAgainst { get; set; }

  [Name("xGoalsFromxReboundsOfShotsAgainst")]
  public double XGoalsFromXReboundsOfShotsAgainst { get; set; }

  [Name("xGoalsFromActualReboundsOfShotsAgainst")]
  public double XGoalsFromActualReboundsOfShotsAgainst { get; set; }

  [Name("reboundxGoalsAgainst")]
  public double ReboundXGoalsAgainst { get; set; }

  [Name("totalShotCreditAgainst")]
  public double TotalShotCreditAgainst { get; set; }

  [Name("scoreAdjustedTotalShotCreditAgainst")]
  public double ScoreAdjustedTotalShotCreditAgainst { get; set; }

  [Name("scoreFlurryAdjustedTotalShotCreditAgainst")]
  public double ScoreFlurryAdjustedTotalShotCreditAgainst { get; set; }
}
