namespace Benchwarmer.Data.Entities;

public class TeamSeason
{
    public int Id { get; set; }
    public required string TeamAbbreviation { get; set; }  // "TOR", "MTL", etc.
    public int Season { get; set; }                        // 2025 = 2024-25 season
    public required string Situation { get; set; }         // "all", "5on5", "other", etc.
    public bool IsPlayoffs { get; set; }                   // true for playoff stats, false for regular season

    // Basic stats
    public int GamesPlayed { get; set; }
    public decimal IceTime { get; set; }

    // Percentages
    public decimal? XGoalsPercentage { get; set; }
    public decimal? CorsiPercentage { get; set; }
    public decimal? FenwickPercentage { get; set; }

    // For stats (offensive)
    public decimal XOnGoalFor { get; set; }
    public decimal XGoalsFor { get; set; }
    public decimal XReboundsFor { get; set; }
    public decimal XFreezeFor { get; set; }
    public decimal XPlayStoppedFor { get; set; }
    public decimal XPlayContinuedInZoneFor { get; set; }
    public decimal XPlayContinuedOutsideZoneFor { get; set; }
    public decimal FlurryAdjustedXGoalsFor { get; set; }
    public decimal ScoreVenueAdjustedXGoalsFor { get; set; }
    public decimal FlurryScoreVenueAdjustedXGoalsFor { get; set; }
    public int ShotsOnGoalFor { get; set; }
    public int MissedShotsFor { get; set; }
    public int BlockedShotAttemptsFor { get; set; }
    public int ShotAttemptsFor { get; set; }
    public int GoalsFor { get; set; }
    public int ReboundsFor { get; set; }
    public int ReboundGoalsFor { get; set; }
    public int FreezeFor { get; set; }
    public int PlayStoppedFor { get; set; }
    public int PlayContinuedInZoneFor { get; set; }
    public int PlayContinuedOutsideZoneFor { get; set; }
    public int SavedShotsOnGoalFor { get; set; }
    public int SavedUnblockedShotAttemptsFor { get; set; }
    public int PenaltiesFor { get; set; }
    public int PenaltyMinutesFor { get; set; }
    public int FaceOffsWonFor { get; set; }
    public int HitsFor { get; set; }
    public int TakeawaysFor { get; set; }
    public int GiveawaysFor { get; set; }
    public int LowDangerShotsFor { get; set; }
    public int MediumDangerShotsFor { get; set; }
    public int HighDangerShotsFor { get; set; }
    public decimal LowDangerXGoalsFor { get; set; }
    public decimal MediumDangerXGoalsFor { get; set; }
    public decimal HighDangerXGoalsFor { get; set; }
    public int LowDangerGoalsFor { get; set; }
    public int MediumDangerGoalsFor { get; set; }
    public int HighDangerGoalsFor { get; set; }
    public decimal ScoreAdjustedShotAttemptsFor { get; set; }
    public decimal UnblockedShotAttemptsFor { get; set; }
    public decimal ScoreAdjustedUnblockedShotAttemptsFor { get; set; }
    public int DZoneGiveawaysFor { get; set; }
    public decimal XGoalsFromXReboundsOfShotsFor { get; set; }
    public decimal XGoalsFromActualReboundsOfShotsFor { get; set; }
    public decimal ReboundXGoalsFor { get; set; }
    public decimal TotalShotCreditFor { get; set; }
    public decimal ScoreAdjustedTotalShotCreditFor { get; set; }
    public decimal ScoreFlurryAdjustedTotalShotCreditFor { get; set; }

    // Against stats (defensive)
    public decimal XOnGoalAgainst { get; set; }
    public decimal XGoalsAgainst { get; set; }
    public decimal XReboundsAgainst { get; set; }
    public decimal XFreezeAgainst { get; set; }
    public decimal XPlayStoppedAgainst { get; set; }
    public decimal XPlayContinuedInZoneAgainst { get; set; }
    public decimal XPlayContinuedOutsideZoneAgainst { get; set; }
    public decimal FlurryAdjustedXGoalsAgainst { get; set; }
    public decimal ScoreVenueAdjustedXGoalsAgainst { get; set; }
    public decimal FlurryScoreVenueAdjustedXGoalsAgainst { get; set; }
    public int ShotsOnGoalAgainst { get; set; }
    public int MissedShotsAgainst { get; set; }
    public int BlockedShotAttemptsAgainst { get; set; }
    public int ShotAttemptsAgainst { get; set; }
    public int GoalsAgainst { get; set; }
    public int ReboundsAgainst { get; set; }
    public int ReboundGoalsAgainst { get; set; }
    public int FreezeAgainst { get; set; }
    public int PlayStoppedAgainst { get; set; }
    public int PlayContinuedInZoneAgainst { get; set; }
    public int PlayContinuedOutsideZoneAgainst { get; set; }
    public int SavedShotsOnGoalAgainst { get; set; }
    public int SavedUnblockedShotAttemptsAgainst { get; set; }
    public int PenaltiesAgainst { get; set; }
    public int PenaltyMinutesAgainst { get; set; }
    public int FaceOffsWonAgainst { get; set; }
    public int HitsAgainst { get; set; }
    public int TakeawaysAgainst { get; set; }
    public int GiveawaysAgainst { get; set; }
    public int LowDangerShotsAgainst { get; set; }
    public int MediumDangerShotsAgainst { get; set; }
    public int HighDangerShotsAgainst { get; set; }
    public decimal LowDangerXGoalsAgainst { get; set; }
    public decimal MediumDangerXGoalsAgainst { get; set; }
    public decimal HighDangerXGoalsAgainst { get; set; }
    public int LowDangerGoalsAgainst { get; set; }
    public int MediumDangerGoalsAgainst { get; set; }
    public int HighDangerGoalsAgainst { get; set; }
    public decimal ScoreAdjustedShotAttemptsAgainst { get; set; }
    public decimal UnblockedShotAttemptsAgainst { get; set; }
    public decimal ScoreAdjustedUnblockedShotAttemptsAgainst { get; set; }
    public int DZoneGiveawaysAgainst { get; set; }
    public decimal XGoalsFromXReboundsOfShotsAgainst { get; set; }
    public decimal XGoalsFromActualReboundsOfShotsAgainst { get; set; }
    public decimal ReboundXGoalsAgainst { get; set; }
    public decimal TotalShotCreditAgainst { get; set; }
    public decimal ScoreAdjustedTotalShotCreditAgainst { get; set; }
    public decimal ScoreFlurryAdjustedTotalShotCreditAgainst { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Team? Team { get; set; }
}
