namespace Benchwarmer.Data.Entities;

/// <summary>
/// "Everything else" from MoneyPuck skaters.csv.
/// Kept in a separate table so the hot-path SkaterSeason table stays lean.
/// </summary>
public class SkaterSeasonAdvanced
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public int Season { get; set; }
    public required string Team { get; set; }
    public required string Situation { get; set; }
    public bool IsPlayoffs { get; set; }

    // Raw on-ice for/against components (oiSh% / oiSv% are stored in SkaterSeason)
    public decimal? OnIceGoalsFor { get; set; }
    public decimal? OnIceShotsOnGoalFor { get; set; }
    public decimal? OnIceGoalsAgainst { get; set; }
    public decimal? OnIceShotsOnGoalAgainst { get; set; }

    // All additional MoneyPuck columns not stored on SkaterSeason
    public decimal? Shifts { get; set; }
    public decimal? GameScore { get; set; }
    public decimal? OnIceXGoalsPercentage { get; set; }
    public decimal? OffIceXGoalsPercentage { get; set; }
    public decimal? OffIceCorsiPercentage { get; set; }
    public decimal? OffIceFenwickPercentage { get; set; }
    public decimal? IceTimeRank { get; set; }
    public decimal? IFXOnGoal { get; set; }
    public decimal? IFXRebounds { get; set; }
    public decimal? IFXFreeze { get; set; }
    public decimal? IFXPlayStopped { get; set; }
    public decimal? IFXPlayContinuedInZone { get; set; }
    public decimal? IFXPlayContinuedOutsideZone { get; set; }
    public decimal? IFFlurryAdjustedxGoals { get; set; }
    public decimal? IFScoreVenueAdjustedxGoals { get; set; }
    public decimal? IFFlurryScoreVenueAdjustedxGoals { get; set; }
    public decimal? IFMissedShots { get; set; }
    public decimal? IFBlockedShotAttempts { get; set; }
    public decimal? IFShotAttempts { get; set; }
    public decimal? IFPoints { get; set; }
    public decimal? IFRebounds { get; set; }
    public decimal? IFReboundGoals { get; set; }
    public decimal? IFFreeze { get; set; }
    public decimal? IFPlayStopped { get; set; }
    public decimal? IFPlayContinuedInZone { get; set; }
    public decimal? IFPlayContinuedOutsideZone { get; set; }
    public decimal? IFSavedShotsOnGoal { get; set; }
    public decimal? IFSavedUnblockedShotAttempts { get; set; }
    public decimal? Penalties { get; set; }
    public decimal? IFPenalityMinutes { get; set; }
    public decimal? IFFaceOffsWon { get; set; }
    public decimal? IFHits { get; set; }
    public decimal? IFTakeaways { get; set; }
    public decimal? IFGiveaways { get; set; }
    public decimal? IFLowDangerShots { get; set; }
    public decimal? IFMediumDangerShots { get; set; }
    public decimal? IFHighDangerShots { get; set; }
    public decimal? IFLowDangerxGoals { get; set; }
    public decimal? IFMediumDangerxGoals { get; set; }
    public decimal? IFHighDangerxGoals { get; set; }
    public decimal? IFLowDangerGoals { get; set; }
    public decimal? IFMediumDangerGoals { get; set; }
    public decimal? IFHighDangerGoals { get; set; }
    public decimal? IFScoreAdjustedShotsAttempts { get; set; }
    public decimal? IFUnblockedShotAttempts { get; set; }
    public decimal? IFScoreAdjustedUnblockedShotAttempts { get; set; }
    public decimal? IFDZoneGiveaways { get; set; }
    public decimal? IFXGoalsFromxReboundsOfShots { get; set; }
    public decimal? IFXGoalsFromActualReboundsOfShots { get; set; }
    public decimal? IFReboundxGoals { get; set; }
    public decimal? IFXGoalsWithEarnedRebounds { get; set; }
    public decimal? IFXGoalsWithEarnedReboundsScoreAdjusted { get; set; }
    public decimal? IFXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }
    public decimal? IFShifts { get; set; }
    public decimal? IFOZoneShiftStarts { get; set; }
    public decimal? IFDZoneShiftStarts { get; set; }
    public decimal? IFNeutralZoneShiftStarts { get; set; }
    public decimal? IFFlyShiftStarts { get; set; }
    public decimal? IFOZoneShiftEnds { get; set; }
    public decimal? IFDZoneShiftEnds { get; set; }
    public decimal? IFNeutralZoneShiftEnds { get; set; }
    public decimal? IFFlyShiftEnds { get; set; }
    public decimal? FaceoffsWon { get; set; }
    public decimal? FaceoffsLost { get; set; }
    public decimal? TimeOnBench { get; set; }
    public decimal? PenalityMinutes { get; set; }
    public decimal? PenalityMinutesDrawn { get; set; }
    public decimal? PenaltiesDrawn { get; set; }
    public decimal? ShotsBlockedByPlayer { get; set; }
    public decimal? OnIceFXOnGoal { get; set; }
    public decimal? OnIceFXGoals { get; set; }
    public decimal? OnIceFFlurryAdjustedxGoals { get; set; }
    public decimal? OnIceFScoreVenueAdjustedxGoals { get; set; }
    public decimal? OnIceFFlurryScoreVenueAdjustedxGoals { get; set; }
    public decimal? OnIceFMissedShots { get; set; }
    public decimal? OnIceFBlockedShotAttempts { get; set; }
    public decimal? OnIceFShotAttempts { get; set; }
    public decimal? OnIceFRebounds { get; set; }
    public decimal? OnIceFReboundGoals { get; set; }
    public decimal? OnIceFLowDangerShots { get; set; }
    public decimal? OnIceFMediumDangerShots { get; set; }
    public decimal? OnIceFHighDangerShots { get; set; }
    public decimal? OnIceFLowDangerxGoals { get; set; }
    public decimal? OnIceFMediumDangerxGoals { get; set; }
    public decimal? OnIceFHighDangerxGoals { get; set; }
    public decimal? OnIceFLowDangerGoals { get; set; }
    public decimal? OnIceFMediumDangerGoals { get; set; }
    public decimal? OnIceFHighDangerGoals { get; set; }
    public decimal? OnIceFScoreAdjustedShotsAttempts { get; set; }
    public decimal? OnIceFUnblockedShotAttempts { get; set; }
    public decimal? OnIceFScoreAdjustedUnblockedShotAttempts { get; set; }
    public decimal? OnIceFXGoalsFromxReboundsOfShots { get; set; }
    public decimal? OnIceFXGoalsFromActualReboundsOfShots { get; set; }
    public decimal? OnIceFReboundxGoals { get; set; }
    public decimal? OnIceFXGoalsWithEarnedRebounds { get; set; }
    public decimal? OnIceFXGoalsWithEarnedReboundsScoreAdjusted { get; set; }
    public decimal? OnIceFXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }
    public decimal? OnIceAXOnGoal { get; set; }
    public decimal? OnIceAXGoals { get; set; }
    public decimal? OnIceAFlurryAdjustedxGoals { get; set; }
    public decimal? OnIceAScoreVenueAdjustedxGoals { get; set; }
    public decimal? OnIceAFlurryScoreVenueAdjustedxGoals { get; set; }
    public decimal? OnIceAMissedShots { get; set; }
    public decimal? OnIceABlockedShotAttempts { get; set; }
    public decimal? OnIceAShotAttempts { get; set; }
    public decimal? OnIceARebounds { get; set; }
    public decimal? OnIceAReboundGoals { get; set; }
    public decimal? OnIceALowDangerShots { get; set; }
    public decimal? OnIceAMediumDangerShots { get; set; }
    public decimal? OnIceAHighDangerShots { get; set; }
    public decimal? OnIceALowDangerxGoals { get; set; }
    public decimal? OnIceAMediumDangerxGoals { get; set; }
    public decimal? OnIceAHighDangerxGoals { get; set; }
    public decimal? OnIceALowDangerGoals { get; set; }
    public decimal? OnIceAMediumDangerGoals { get; set; }
    public decimal? OnIceAHighDangerGoals { get; set; }
    public decimal? OnIceAScoreAdjustedShotsAttempts { get; set; }
    public decimal? OnIceAUnblockedShotAttempts { get; set; }
    public decimal? OnIceAScoreAdjustedUnblockedShotAttempts { get; set; }
    public decimal? OnIceAXGoalsFromxReboundsOfShots { get; set; }
    public decimal? OnIceAXGoalsFromActualReboundsOfShots { get; set; }
    public decimal? OnIceAReboundxGoals { get; set; }
    public decimal? OnIceAXGoalsWithEarnedRebounds { get; set; }
    public decimal? OnIceAXGoalsWithEarnedReboundsScoreAdjusted { get; set; }
    public decimal? OnIceAXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }
    public decimal? OffIceFXGoals { get; set; }
    public decimal? OffIceAXGoals { get; set; }
    public decimal? OffIceFShotAttempts { get; set; }
    public decimal? OffIceAShotAttempts { get; set; }
    public decimal? XGoalsForAfterShifts { get; set; }
    public decimal? XGoalsAgainstAfterShifts { get; set; }
    public decimal? CorsiForAfterShifts { get; set; }
    public decimal? CorsiAgainstAfterShifts { get; set; }
    public decimal? FenwickForAfterShifts { get; set; }
    public decimal? FenwickAgainstAfterShifts { get; set; }

    // Navigation
    public Player? Player { get; set; }
}

