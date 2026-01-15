using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

public class TeamRecord
{
    [Name("team")]
    public string Team { get; set; } = "";

    [Name("season")]
    public int Season { get; set; }

    [Name("name")]
    public string Name { get; set; } = "";

    [Name("position")]
    public string Position { get; set; } = "";

    [Name("situation")]
    public string Situation { get; set; } = "";

    [Name("games_played")]
    public int GamesPlayed { get; set; }

    [Name("xGoalsPercentage")]
    public decimal? XGoalsPercentage { get; set; }

    [Name("corsiPercentage")]
    public decimal? CorsiPercentage { get; set; }

    [Name("fenwickPercentage")]
    public decimal? FenwickPercentage { get; set; }

    [Name("iceTime")]
    public decimal IceTime { get; set; }

    // For stats (offensive)
    [Name("xOnGoalFor")]
    public decimal XOnGoalFor { get; set; }

    [Name("xGoalsFor")]
    public decimal XGoalsFor { get; set; }

    [Name("xReboundsFor")]
    public decimal XReboundsFor { get; set; }

    [Name("xFreezeFor")]
    public decimal XFreezeFor { get; set; }

    [Name("xPlayStoppedFor")]
    public decimal XPlayStoppedFor { get; set; }

    [Name("xPlayContinuedInZoneFor")]
    public decimal XPlayContinuedInZoneFor { get; set; }

    [Name("xPlayContinuedOutsideZoneFor")]
    public decimal XPlayContinuedOutsideZoneFor { get; set; }

    [Name("flurryAdjustedxGoalsFor")]
    public decimal FlurryAdjustedXGoalsFor { get; set; }

    [Name("scoreVenueAdjustedxGoalsFor")]
    public decimal ScoreVenueAdjustedXGoalsFor { get; set; }

    [Name("flurryScoreVenueAdjustedxGoalsFor")]
    public decimal FlurryScoreVenueAdjustedXGoalsFor { get; set; }

    [Name("shotsOnGoalFor")]
    public decimal ShotsOnGoalFor { get; set; }

    [Name("missedShotsFor")]
    public decimal MissedShotsFor { get; set; }

    [Name("blockedShotAttemptsFor")]
    public decimal BlockedShotAttemptsFor { get; set; }

    [Name("shotAttemptsFor")]
    public decimal ShotAttemptsFor { get; set; }

    [Name("goalsFor")]
    public decimal GoalsFor { get; set; }

    [Name("reboundsFor")]
    public decimal ReboundsFor { get; set; }

    [Name("reboundGoalsFor")]
    public decimal ReboundGoalsFor { get; set; }

    [Name("freezeFor")]
    public decimal FreezeFor { get; set; }

    [Name("playStoppedFor")]
    public decimal PlayStoppedFor { get; set; }

    [Name("playContinuedInZoneFor")]
    public decimal PlayContinuedInZoneFor { get; set; }

    [Name("playContinuedOutsideZoneFor")]
    public decimal PlayContinuedOutsideZoneFor { get; set; }

    [Name("savedShotsOnGoalFor")]
    public decimal SavedShotsOnGoalFor { get; set; }

    [Name("savedUnblockedShotAttemptsFor")]
    public decimal SavedUnblockedShotAttemptsFor { get; set; }

    [Name("penaltiesFor")]
    public decimal PenaltiesFor { get; set; }

    [Name("penalityMinutesFor")]
    public decimal PenaltyMinutesFor { get; set; }

    [Name("faceOffsWonFor")]
    public decimal FaceOffsWonFor { get; set; }

    [Name("hitsFor")]
    public decimal HitsFor { get; set; }

    [Name("takeawaysFor")]
    public decimal TakeawaysFor { get; set; }

    [Name("giveawaysFor")]
    public decimal GiveawaysFor { get; set; }

    [Name("lowDangerShotsFor")]
    public decimal LowDangerShotsFor { get; set; }

    [Name("mediumDangerShotsFor")]
    public decimal MediumDangerShotsFor { get; set; }

    [Name("highDangerShotsFor")]
    public decimal HighDangerShotsFor { get; set; }

    [Name("lowDangerxGoalsFor")]
    public decimal LowDangerXGoalsFor { get; set; }

    [Name("mediumDangerxGoalsFor")]
    public decimal MediumDangerXGoalsFor { get; set; }

    [Name("highDangerxGoalsFor")]
    public decimal HighDangerXGoalsFor { get; set; }

    [Name("lowDangerGoalsFor")]
    public decimal LowDangerGoalsFor { get; set; }

    [Name("mediumDangerGoalsFor")]
    public decimal MediumDangerGoalsFor { get; set; }

    [Name("highDangerGoalsFor")]
    public decimal HighDangerGoalsFor { get; set; }

    [Name("scoreAdjustedShotsAttemptsFor")]
    public decimal ScoreAdjustedShotAttemptsFor { get; set; }

    [Name("unblockedShotAttemptsFor")]
    public decimal UnblockedShotAttemptsFor { get; set; }

    [Name("scoreAdjustedUnblockedShotAttemptsFor")]
    public decimal ScoreAdjustedUnblockedShotAttemptsFor { get; set; }

    [Name("dZoneGiveawaysFor")]
    public decimal DZoneGiveawaysFor { get; set; }

    [Name("xGoalsFromxReboundsOfShotsFor")]
    public decimal XGoalsFromXReboundsOfShotsFor { get; set; }

    [Name("xGoalsFromActualReboundsOfShotsFor")]
    public decimal XGoalsFromActualReboundsOfShotsFor { get; set; }

    [Name("reboundxGoalsFor")]
    public decimal ReboundXGoalsFor { get; set; }

    [Name("totalShotCreditFor")]
    public decimal TotalShotCreditFor { get; set; }

    [Name("scoreAdjustedTotalShotCreditFor")]
    public decimal ScoreAdjustedTotalShotCreditFor { get; set; }

    [Name("scoreFlurryAdjustedTotalShotCreditFor")]
    public decimal ScoreFlurryAdjustedTotalShotCreditFor { get; set; }

    // Against stats (defensive)
    [Name("xOnGoalAgainst")]
    public decimal XOnGoalAgainst { get; set; }

    [Name("xGoalsAgainst")]
    public decimal XGoalsAgainst { get; set; }

    [Name("xReboundsAgainst")]
    public decimal XReboundsAgainst { get; set; }

    [Name("xFreezeAgainst")]
    public decimal XFreezeAgainst { get; set; }

    [Name("xPlayStoppedAgainst")]
    public decimal XPlayStoppedAgainst { get; set; }

    [Name("xPlayContinuedInZoneAgainst")]
    public decimal XPlayContinuedInZoneAgainst { get; set; }

    [Name("xPlayContinuedOutsideZoneAgainst")]
    public decimal XPlayContinuedOutsideZoneAgainst { get; set; }

    [Name("flurryAdjustedxGoalsAgainst")]
    public decimal FlurryAdjustedXGoalsAgainst { get; set; }

    [Name("scoreVenueAdjustedxGoalsAgainst")]
    public decimal ScoreVenueAdjustedXGoalsAgainst { get; set; }

    [Name("flurryScoreVenueAdjustedxGoalsAgainst")]
    public decimal FlurryScoreVenueAdjustedXGoalsAgainst { get; set; }

    [Name("shotsOnGoalAgainst")]
    public decimal ShotsOnGoalAgainst { get; set; }

    [Name("missedShotsAgainst")]
    public decimal MissedShotsAgainst { get; set; }

    [Name("blockedShotAttemptsAgainst")]
    public decimal BlockedShotAttemptsAgainst { get; set; }

    [Name("shotAttemptsAgainst")]
    public decimal ShotAttemptsAgainst { get; set; }

    [Name("goalsAgainst")]
    public decimal GoalsAgainst { get; set; }

    [Name("reboundsAgainst")]
    public decimal ReboundsAgainst { get; set; }

    [Name("reboundGoalsAgainst")]
    public decimal ReboundGoalsAgainst { get; set; }

    [Name("freezeAgainst")]
    public decimal FreezeAgainst { get; set; }

    [Name("playStoppedAgainst")]
    public decimal PlayStoppedAgainst { get; set; }

    [Name("playContinuedInZoneAgainst")]
    public decimal PlayContinuedInZoneAgainst { get; set; }

    [Name("playContinuedOutsideZoneAgainst")]
    public decimal PlayContinuedOutsideZoneAgainst { get; set; }

    [Name("savedShotsOnGoalAgainst")]
    public decimal SavedShotsOnGoalAgainst { get; set; }

    [Name("savedUnblockedShotAttemptsAgainst")]
    public decimal SavedUnblockedShotAttemptsAgainst { get; set; }

    [Name("penaltiesAgainst")]
    public decimal PenaltiesAgainst { get; set; }

    [Name("penalityMinutesAgainst")]
    public decimal PenaltyMinutesAgainst { get; set; }

    [Name("faceOffsWonAgainst")]
    public decimal FaceOffsWonAgainst { get; set; }

    [Name("hitsAgainst")]
    public decimal HitsAgainst { get; set; }

    [Name("takeawaysAgainst")]
    public decimal TakeawaysAgainst { get; set; }

    [Name("giveawaysAgainst")]
    public decimal GiveawaysAgainst { get; set; }

    [Name("lowDangerShotsAgainst")]
    public decimal LowDangerShotsAgainst { get; set; }

    [Name("mediumDangerShotsAgainst")]
    public decimal MediumDangerShotsAgainst { get; set; }

    [Name("highDangerShotsAgainst")]
    public decimal HighDangerShotsAgainst { get; set; }

    [Name("lowDangerxGoalsAgainst")]
    public decimal LowDangerXGoalsAgainst { get; set; }

    [Name("mediumDangerxGoalsAgainst")]
    public decimal MediumDangerXGoalsAgainst { get; set; }

    [Name("highDangerxGoalsAgainst")]
    public decimal HighDangerXGoalsAgainst { get; set; }

    [Name("lowDangerGoalsAgainst")]
    public decimal LowDangerGoalsAgainst { get; set; }

    [Name("mediumDangerGoalsAgainst")]
    public decimal MediumDangerGoalsAgainst { get; set; }

    [Name("highDangerGoalsAgainst")]
    public decimal HighDangerGoalsAgainst { get; set; }

    [Name("scoreAdjustedShotsAttemptsAgainst")]
    public decimal ScoreAdjustedShotAttemptsAgainst { get; set; }

    [Name("unblockedShotAttemptsAgainst")]
    public decimal UnblockedShotAttemptsAgainst { get; set; }

    [Name("scoreAdjustedUnblockedShotAttemptsAgainst")]
    public decimal ScoreAdjustedUnblockedShotAttemptsAgainst { get; set; }

    [Name("dZoneGiveawaysAgainst")]
    public decimal DZoneGiveawaysAgainst { get; set; }

    [Name("xGoalsFromxReboundsOfShotsAgainst")]
    public decimal XGoalsFromXReboundsOfShotsAgainst { get; set; }

    [Name("xGoalsFromActualReboundsOfShotsAgainst")]
    public decimal XGoalsFromActualReboundsOfShotsAgainst { get; set; }

    [Name("reboundxGoalsAgainst")]
    public decimal ReboundXGoalsAgainst { get; set; }

    [Name("totalShotCreditAgainst")]
    public decimal TotalShotCreditAgainst { get; set; }

    [Name("scoreAdjustedTotalShotCreditAgainst")]
    public decimal ScoreAdjustedTotalShotCreditAgainst { get; set; }

    [Name("scoreFlurryAdjustedTotalShotCreditAgainst")]
    public decimal ScoreFlurryAdjustedTotalShotCreditAgainst { get; set; }
}
