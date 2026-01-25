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

  [Name("position")]
  public string? Position { get; set; }

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

  // On-ice team results (used to compute oiSh% / oiSv%)
  [Name("OnIce_F_goals")]
  public decimal? OnIceGoalsFor { get; set; }

  [Name("OnIce_F_shotsOnGoal")]
  public decimal? OnIceShotsOnGoalFor { get; set; }

  [Name("OnIce_A_goals")]
  public decimal? OnIceGoalsAgainst { get; set; }

  [Name("OnIce_A_shotsOnGoal")]
  public decimal? OnIceShotsOnGoalAgainst { get; set; }

  // Everything else from MoneyPuck's skaters.csv (kept for future use)
  [Name("shifts")]
  public decimal? Shifts { get; set; }

  [Name("gameScore")]
  public decimal? GameScore { get; set; }

  [Name("onIce_xGoalsPercentage")]
  public decimal? OnIceXGoalsPercentage { get; set; }

  [Name("offIce_xGoalsPercentage")]
  public decimal? OffIceXGoalsPercentage { get; set; }

  [Name("offIce_corsiPercentage")]
  public decimal? OffIceCorsiPercentage { get; set; }

  [Name("offIce_fenwickPercentage")]
  public decimal? OffIceFenwickPercentage { get; set; }

  [Name("iceTimeRank")]
  public decimal? IceTimeRank { get; set; }

  [Name("I_F_xOnGoal")]
  public decimal? IFXOnGoal { get; set; }

  [Name("I_F_xRebounds")]
  public decimal? IFXRebounds { get; set; }

  [Name("I_F_xFreeze")]
  public decimal? IFXFreeze { get; set; }

  [Name("I_F_xPlayStopped")]
  public decimal? IFXPlayStopped { get; set; }

  [Name("I_F_xPlayContinuedInZone")]
  public decimal? IFXPlayContinuedInZone { get; set; }

  [Name("I_F_xPlayContinuedOutsideZone")]
  public decimal? IFXPlayContinuedOutsideZone { get; set; }

  [Name("I_F_flurryAdjustedxGoals")]
  public decimal? IFFlurryAdjustedxGoals { get; set; }

  [Name("I_F_scoreVenueAdjustedxGoals")]
  public decimal? IFScoreVenueAdjustedxGoals { get; set; }

  [Name("I_F_flurryScoreVenueAdjustedxGoals")]
  public decimal? IFFlurryScoreVenueAdjustedxGoals { get; set; }

  [Name("I_F_missedShots")]
  public decimal? IFMissedShots { get; set; }

  [Name("I_F_blockedShotAttempts")]
  public decimal? IFBlockedShotAttempts { get; set; }

  [Name("I_F_shotAttempts")]
  public decimal? IFShotAttempts { get; set; }

  [Name("I_F_points")]
  public decimal? IFPoints { get; set; }

  [Name("I_F_rebounds")]
  public decimal? IFRebounds { get; set; }

  [Name("I_F_reboundGoals")]
  public decimal? IFReboundGoals { get; set; }

  [Name("I_F_freeze")]
  public decimal? IFFreeze { get; set; }

  [Name("I_F_playStopped")]
  public decimal? IFPlayStopped { get; set; }

  [Name("I_F_playContinuedInZone")]
  public decimal? IFPlayContinuedInZone { get; set; }

  [Name("I_F_playContinuedOutsideZone")]
  public decimal? IFPlayContinuedOutsideZone { get; set; }

  [Name("I_F_savedShotsOnGoal")]
  public decimal? IFSavedShotsOnGoal { get; set; }

  [Name("I_F_savedUnblockedShotAttempts")]
  public decimal? IFSavedUnblockedShotAttempts { get; set; }

  [Name("penalties")]
  public decimal? Penalties { get; set; }

  [Name("I_F_penalityMinutes")]
  public decimal? IFPenalityMinutes { get; set; }

  [Name("I_F_faceOffsWon")]
  public decimal? IFFaceOffsWon { get; set; }

  [Name("I_F_hits")]
  public decimal? IFHits { get; set; }

  [Name("I_F_takeaways")]
  public decimal? IFTakeaways { get; set; }

  [Name("I_F_giveaways")]
  public decimal? IFGiveaways { get; set; }

  [Name("I_F_lowDangerShots")]
  public decimal? IFLowDangerShots { get; set; }

  [Name("I_F_mediumDangerShots")]
  public decimal? IFMediumDangerShots { get; set; }

  [Name("I_F_highDangerShots")]
  public decimal? IFHighDangerShots { get; set; }

  [Name("I_F_lowDangerxGoals")]
  public decimal? IFLowDangerxGoals { get; set; }

  [Name("I_F_mediumDangerxGoals")]
  public decimal? IFMediumDangerxGoals { get; set; }

  [Name("I_F_highDangerxGoals")]
  public decimal? IFHighDangerxGoals { get; set; }

  [Name("I_F_lowDangerGoals")]
  public decimal? IFLowDangerGoals { get; set; }

  [Name("I_F_mediumDangerGoals")]
  public decimal? IFMediumDangerGoals { get; set; }

  [Name("I_F_highDangerGoals")]
  public decimal? IFHighDangerGoals { get; set; }

  [Name("I_F_scoreAdjustedShotsAttempts")]
  public decimal? IFScoreAdjustedShotsAttempts { get; set; }

  [Name("I_F_unblockedShotAttempts")]
  public decimal? IFUnblockedShotAttempts { get; set; }

  [Name("I_F_scoreAdjustedUnblockedShotAttempts")]
  public decimal? IFScoreAdjustedUnblockedShotAttempts { get; set; }

  [Name("I_F_dZoneGiveaways")]
  public decimal? IFDZoneGiveaways { get; set; }

  [Name("I_F_xGoalsFromxReboundsOfShots")]
  public decimal? IFXGoalsFromxReboundsOfShots { get; set; }

  [Name("I_F_xGoalsFromActualReboundsOfShots")]
  public decimal? IFXGoalsFromActualReboundsOfShots { get; set; }

  [Name("I_F_reboundxGoals")]
  public decimal? IFReboundxGoals { get; set; }

  [Name("I_F_xGoals_with_earned_rebounds")]
  public decimal? IFXGoalsWithEarnedRebounds { get; set; }

  [Name("I_F_xGoals_with_earned_rebounds_scoreAdjusted")]
  public decimal? IFXGoalsWithEarnedReboundsScoreAdjusted { get; set; }

  [Name("I_F_xGoals_with_earned_rebounds_scoreFlurryAdjusted")]
  public decimal? IFXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }

  [Name("I_F_shifts")]
  public decimal? IFShifts { get; set; }

  [Name("I_F_oZoneShiftStarts")]
  public decimal? IFOZoneShiftStarts { get; set; }

  [Name("I_F_dZoneShiftStarts")]
  public decimal? IFDZoneShiftStarts { get; set; }

  [Name("I_F_neutralZoneShiftStarts")]
  public decimal? IFNeutralZoneShiftStarts { get; set; }

  [Name("I_F_flyShiftStarts")]
  public decimal? IFFlyShiftStarts { get; set; }

  [Name("I_F_oZoneShiftEnds")]
  public decimal? IFOZoneShiftEnds { get; set; }

  [Name("I_F_dZoneShiftEnds")]
  public decimal? IFDZoneShiftEnds { get; set; }

  [Name("I_F_neutralZoneShiftEnds")]
  public decimal? IFNeutralZoneShiftEnds { get; set; }

  [Name("I_F_flyShiftEnds")]
  public decimal? IFFlyShiftEnds { get; set; }

  [Name("faceoffsWon")]
  public decimal? FaceoffsWon { get; set; }

  [Name("faceoffsLost")]
  public decimal? FaceoffsLost { get; set; }

  [Name("timeOnBench")]
  public decimal? TimeOnBench { get; set; }

  [Name("penalityMinutes")]
  public decimal? PenalityMinutes { get; set; }

  [Name("penalityMinutesDrawn")]
  public decimal? PenalityMinutesDrawn { get; set; }

  [Name("penaltiesDrawn")]
  public decimal? PenaltiesDrawn { get; set; }

  [Name("shotsBlockedByPlayer")]
  public decimal? ShotsBlockedByPlayer { get; set; }

  [Name("OnIce_F_xOnGoal")]
  public decimal? OnIceFXOnGoal { get; set; }

  [Name("OnIce_F_xGoals")]
  public decimal? OnIceFXGoals { get; set; }

  [Name("OnIce_F_flurryAdjustedxGoals")]
  public decimal? OnIceFFlurryAdjustedxGoals { get; set; }

  [Name("OnIce_F_scoreVenueAdjustedxGoals")]
  public decimal? OnIceFScoreVenueAdjustedxGoals { get; set; }

  [Name("OnIce_F_flurryScoreVenueAdjustedxGoals")]
  public decimal? OnIceFFlurryScoreVenueAdjustedxGoals { get; set; }

  [Name("OnIce_F_missedShots")]
  public decimal? OnIceFMissedShots { get; set; }

  [Name("OnIce_F_blockedShotAttempts")]
  public decimal? OnIceFBlockedShotAttempts { get; set; }

  [Name("OnIce_F_shotAttempts")]
  public decimal? OnIceFShotAttempts { get; set; }

  [Name("OnIce_F_rebounds")]
  public decimal? OnIceFRebounds { get; set; }

  [Name("OnIce_F_reboundGoals")]
  public decimal? OnIceFReboundGoals { get; set; }

  [Name("OnIce_F_lowDangerShots")]
  public decimal? OnIceFLowDangerShots { get; set; }

  [Name("OnIce_F_mediumDangerShots")]
  public decimal? OnIceFMediumDangerShots { get; set; }

  [Name("OnIce_F_highDangerShots")]
  public decimal? OnIceFHighDangerShots { get; set; }

  [Name("OnIce_F_lowDangerxGoals")]
  public decimal? OnIceFLowDangerxGoals { get; set; }

  [Name("OnIce_F_mediumDangerxGoals")]
  public decimal? OnIceFMediumDangerxGoals { get; set; }

  [Name("OnIce_F_highDangerxGoals")]
  public decimal? OnIceFHighDangerxGoals { get; set; }

  [Name("OnIce_F_lowDangerGoals")]
  public decimal? OnIceFLowDangerGoals { get; set; }

  [Name("OnIce_F_mediumDangerGoals")]
  public decimal? OnIceFMediumDangerGoals { get; set; }

  [Name("OnIce_F_highDangerGoals")]
  public decimal? OnIceFHighDangerGoals { get; set; }

  [Name("OnIce_F_scoreAdjustedShotsAttempts")]
  public decimal? OnIceFScoreAdjustedShotsAttempts { get; set; }

  [Name("OnIce_F_unblockedShotAttempts")]
  public decimal? OnIceFUnblockedShotAttempts { get; set; }

  [Name("OnIce_F_scoreAdjustedUnblockedShotAttempts")]
  public decimal? OnIceFScoreAdjustedUnblockedShotAttempts { get; set; }

  [Name("OnIce_F_xGoalsFromxReboundsOfShots")]
  public decimal? OnIceFXGoalsFromxReboundsOfShots { get; set; }

  [Name("OnIce_F_xGoalsFromActualReboundsOfShots")]
  public decimal? OnIceFXGoalsFromActualReboundsOfShots { get; set; }

  [Name("OnIce_F_reboundxGoals")]
  public decimal? OnIceFReboundxGoals { get; set; }

  [Name("OnIce_F_xGoals_with_earned_rebounds")]
  public decimal? OnIceFXGoalsWithEarnedRebounds { get; set; }

  [Name("OnIce_F_xGoals_with_earned_rebounds_scoreAdjusted")]
  public decimal? OnIceFXGoalsWithEarnedReboundsScoreAdjusted { get; set; }

  [Name("OnIce_F_xGoals_with_earned_rebounds_scoreFlurryAdjusted")]
  public decimal? OnIceFXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }

  [Name("OnIce_A_xOnGoal")]
  public decimal? OnIceAXOnGoal { get; set; }

  [Name("OnIce_A_xGoals")]
  public decimal? OnIceAXGoals { get; set; }

  [Name("OnIce_A_flurryAdjustedxGoals")]
  public decimal? OnIceAFlurryAdjustedxGoals { get; set; }

  [Name("OnIce_A_scoreVenueAdjustedxGoals")]
  public decimal? OnIceAScoreVenueAdjustedxGoals { get; set; }

  [Name("OnIce_A_flurryScoreVenueAdjustedxGoals")]
  public decimal? OnIceAFlurryScoreVenueAdjustedxGoals { get; set; }

  [Name("OnIce_A_missedShots")]
  public decimal? OnIceAMissedShots { get; set; }

  [Name("OnIce_A_blockedShotAttempts")]
  public decimal? OnIceABlockedShotAttempts { get; set; }

  [Name("OnIce_A_shotAttempts")]
  public decimal? OnIceAShotAttempts { get; set; }

  [Name("OnIce_A_rebounds")]
  public decimal? OnIceARebounds { get; set; }

  [Name("OnIce_A_reboundGoals")]
  public decimal? OnIceAReboundGoals { get; set; }

  [Name("OnIce_A_lowDangerShots")]
  public decimal? OnIceALowDangerShots { get; set; }

  [Name("OnIce_A_mediumDangerShots")]
  public decimal? OnIceAMediumDangerShots { get; set; }

  [Name("OnIce_A_highDangerShots")]
  public decimal? OnIceAHighDangerShots { get; set; }

  [Name("OnIce_A_lowDangerxGoals")]
  public decimal? OnIceALowDangerxGoals { get; set; }

  [Name("OnIce_A_mediumDangerxGoals")]
  public decimal? OnIceAMediumDangerxGoals { get; set; }

  [Name("OnIce_A_highDangerxGoals")]
  public decimal? OnIceAHighDangerxGoals { get; set; }

  [Name("OnIce_A_lowDangerGoals")]
  public decimal? OnIceALowDangerGoals { get; set; }

  [Name("OnIce_A_mediumDangerGoals")]
  public decimal? OnIceAMediumDangerGoals { get; set; }

  [Name("OnIce_A_highDangerGoals")]
  public decimal? OnIceAHighDangerGoals { get; set; }

  [Name("OnIce_A_scoreAdjustedShotsAttempts")]
  public decimal? OnIceAScoreAdjustedShotsAttempts { get; set; }

  [Name("OnIce_A_unblockedShotAttempts")]
  public decimal? OnIceAUnblockedShotAttempts { get; set; }

  [Name("OnIce_A_scoreAdjustedUnblockedShotAttempts")]
  public decimal? OnIceAScoreAdjustedUnblockedShotAttempts { get; set; }

  [Name("OnIce_A_xGoalsFromxReboundsOfShots")]
  public decimal? OnIceAXGoalsFromxReboundsOfShots { get; set; }

  [Name("OnIce_A_xGoalsFromActualReboundsOfShots")]
  public decimal? OnIceAXGoalsFromActualReboundsOfShots { get; set; }

  [Name("OnIce_A_reboundxGoals")]
  public decimal? OnIceAReboundxGoals { get; set; }

  [Name("OnIce_A_xGoals_with_earned_rebounds")]
  public decimal? OnIceAXGoalsWithEarnedRebounds { get; set; }

  [Name("OnIce_A_xGoals_with_earned_rebounds_scoreAdjusted")]
  public decimal? OnIceAXGoalsWithEarnedReboundsScoreAdjusted { get; set; }

  [Name("OnIce_A_xGoals_with_earned_rebounds_scoreFlurryAdjusted")]
  public decimal? OnIceAXGoalsWithEarnedReboundsScoreFlurryAdjusted { get; set; }

  [Name("OffIce_F_xGoals")]
  public decimal? OffIceFXGoals { get; set; }

  [Name("OffIce_A_xGoals")]
  public decimal? OffIceAXGoals { get; set; }

  [Name("OffIce_F_shotAttempts")]
  public decimal? OffIceFShotAttempts { get; set; }

  [Name("OffIce_A_shotAttempts")]
  public decimal? OffIceAShotAttempts { get; set; }

  [Name("xGoalsForAfterShifts")]
  public decimal? XGoalsForAfterShifts { get; set; }

  [Name("xGoalsAgainstAfterShifts")]
  public decimal? XGoalsAgainstAfterShifts { get; set; }

  [Name("corsiForAfterShifts")]
  public decimal? CorsiForAfterShifts { get; set; }

  [Name("corsiAgainstAfterShifts")]
  public decimal? CorsiAgainstAfterShifts { get; set; }

  [Name("fenwickForAfterShifts")]
  public decimal? FenwickForAfterShifts { get; set; }

  [Name("fenwickAgainstAfterShifts")]
  public decimal? FenwickAgainstAfterShifts { get; set; }
}