using CsvHelper.Configuration.Attributes;

namespace Benchwarmer.Ingestion.Parsers;

// CSV column indices (0-based):
// 0: team, 1: season, 2: name, 3: team (duplicate), 4: position, 5: situation, 6: games_played
// 7: xGoalsPercentage, 8: corsiPercentage, 9: fenwickPercentage, 10: iceTime
// ... see full mapping below

public class TeamRecord
{
    [Index(0)]
    public string Team { get; set; } = "";

    [Index(1)]
    public int Season { get; set; }

    [Index(2)]
    public string Name { get; set; } = "";

    // Index 3 is duplicate "team" - skip it

    [Index(4)]
    public string Position { get; set; } = "";

    [Index(5)]
    public string Situation { get; set; } = "";

    [Index(6)]
    public int GamesPlayed { get; set; }

    [Index(7)]
    public decimal? XGoalsPercentage { get; set; }

    [Index(8)]
    public decimal? CorsiPercentage { get; set; }

    [Index(9)]
    public decimal? FenwickPercentage { get; set; }

    [Index(10)]
    public decimal IceTime { get; set; }

    // For stats (offensive)
    [Index(11)]
    public decimal XOnGoalFor { get; set; }

    [Index(12)]
    public decimal XGoalsFor { get; set; }

    [Index(13)]
    public decimal XReboundsFor { get; set; }

    [Index(14)]
    public decimal XFreezeFor { get; set; }

    [Index(15)]
    public decimal XPlayStoppedFor { get; set; }

    [Index(16)]
    public decimal XPlayContinuedInZoneFor { get; set; }

    [Index(17)]
    public decimal XPlayContinuedOutsideZoneFor { get; set; }

    [Index(18)]
    public decimal FlurryAdjustedXGoalsFor { get; set; }

    [Index(19)]
    public decimal ScoreVenueAdjustedXGoalsFor { get; set; }

    [Index(20)]
    public decimal FlurryScoreVenueAdjustedXGoalsFor { get; set; }

    [Index(21)]
    public decimal ShotsOnGoalFor { get; set; }

    [Index(22)]
    public decimal MissedShotsFor { get; set; }

    [Index(23)]
    public decimal BlockedShotAttemptsFor { get; set; }

    [Index(24)]
    public decimal ShotAttemptsFor { get; set; }

    [Index(25)]
    public decimal GoalsFor { get; set; }

    [Index(26)]
    public decimal ReboundsFor { get; set; }

    [Index(27)]
    public decimal ReboundGoalsFor { get; set; }

    [Index(28)]
    public decimal FreezeFor { get; set; }

    [Index(29)]
    public decimal PlayStoppedFor { get; set; }

    [Index(30)]
    public decimal PlayContinuedInZoneFor { get; set; }

    [Index(31)]
    public decimal PlayContinuedOutsideZoneFor { get; set; }

    [Index(32)]
    public decimal SavedShotsOnGoalFor { get; set; }

    [Index(33)]
    public decimal SavedUnblockedShotAttemptsFor { get; set; }

    [Index(34)]
    public decimal PenaltiesFor { get; set; }

    [Index(35)]
    public decimal PenaltyMinutesFor { get; set; }

    [Index(36)]
    public decimal FaceOffsWonFor { get; set; }

    [Index(37)]
    public decimal HitsFor { get; set; }

    [Index(38)]
    public decimal TakeawaysFor { get; set; }

    [Index(39)]
    public decimal GiveawaysFor { get; set; }

    [Index(40)]
    public decimal LowDangerShotsFor { get; set; }

    [Index(41)]
    public decimal MediumDangerShotsFor { get; set; }

    [Index(42)]
    public decimal HighDangerShotsFor { get; set; }

    [Index(43)]
    public decimal LowDangerXGoalsFor { get; set; }

    [Index(44)]
    public decimal MediumDangerXGoalsFor { get; set; }

    [Index(45)]
    public decimal HighDangerXGoalsFor { get; set; }

    [Index(46)]
    public decimal LowDangerGoalsFor { get; set; }

    [Index(47)]
    public decimal MediumDangerGoalsFor { get; set; }

    [Index(48)]
    public decimal HighDangerGoalsFor { get; set; }

    [Index(49)]
    public decimal ScoreAdjustedShotAttemptsFor { get; set; }

    [Index(50)]
    public decimal UnblockedShotAttemptsFor { get; set; }

    [Index(51)]
    public decimal ScoreAdjustedUnblockedShotAttemptsFor { get; set; }

    [Index(52)]
    public decimal DZoneGiveawaysFor { get; set; }

    [Index(53)]
    public decimal XGoalsFromXReboundsOfShotsFor { get; set; }

    [Index(54)]
    public decimal XGoalsFromActualReboundsOfShotsFor { get; set; }

    [Index(55)]
    public decimal ReboundXGoalsFor { get; set; }

    [Index(56)]
    public decimal TotalShotCreditFor { get; set; }

    [Index(57)]
    public decimal ScoreAdjustedTotalShotCreditFor { get; set; }

    [Index(58)]
    public decimal ScoreFlurryAdjustedTotalShotCreditFor { get; set; }

    // Against stats (defensive)
    [Index(59)]
    public decimal XOnGoalAgainst { get; set; }

    [Index(60)]
    public decimal XGoalsAgainst { get; set; }

    [Index(61)]
    public decimal XReboundsAgainst { get; set; }

    [Index(62)]
    public decimal XFreezeAgainst { get; set; }

    [Index(63)]
    public decimal XPlayStoppedAgainst { get; set; }

    [Index(64)]
    public decimal XPlayContinuedInZoneAgainst { get; set; }

    [Index(65)]
    public decimal XPlayContinuedOutsideZoneAgainst { get; set; }

    [Index(66)]
    public decimal FlurryAdjustedXGoalsAgainst { get; set; }

    [Index(67)]
    public decimal ScoreVenueAdjustedXGoalsAgainst { get; set; }

    [Index(68)]
    public decimal FlurryScoreVenueAdjustedXGoalsAgainst { get; set; }

    [Index(69)]
    public decimal ShotsOnGoalAgainst { get; set; }

    [Index(70)]
    public decimal MissedShotsAgainst { get; set; }

    [Index(71)]
    public decimal BlockedShotAttemptsAgainst { get; set; }

    [Index(72)]
    public decimal ShotAttemptsAgainst { get; set; }

    [Index(73)]
    public decimal GoalsAgainst { get; set; }

    [Index(74)]
    public decimal ReboundsAgainst { get; set; }

    [Index(75)]
    public decimal ReboundGoalsAgainst { get; set; }

    [Index(76)]
    public decimal FreezeAgainst { get; set; }

    [Index(77)]
    public decimal PlayStoppedAgainst { get; set; }

    [Index(78)]
    public decimal PlayContinuedInZoneAgainst { get; set; }

    [Index(79)]
    public decimal PlayContinuedOutsideZoneAgainst { get; set; }

    [Index(80)]
    public decimal SavedShotsOnGoalAgainst { get; set; }

    [Index(81)]
    public decimal SavedUnblockedShotAttemptsAgainst { get; set; }

    [Index(82)]
    public decimal PenaltiesAgainst { get; set; }

    [Index(83)]
    public decimal PenaltyMinutesAgainst { get; set; }

    [Index(84)]
    public decimal FaceOffsWonAgainst { get; set; }

    [Index(85)]
    public decimal HitsAgainst { get; set; }

    [Index(86)]
    public decimal TakeawaysAgainst { get; set; }

    [Index(87)]
    public decimal GiveawaysAgainst { get; set; }

    [Index(88)]
    public decimal LowDangerShotsAgainst { get; set; }

    [Index(89)]
    public decimal MediumDangerShotsAgainst { get; set; }

    [Index(90)]
    public decimal HighDangerShotsAgainst { get; set; }

    [Index(91)]
    public decimal LowDangerXGoalsAgainst { get; set; }

    [Index(92)]
    public decimal MediumDangerXGoalsAgainst { get; set; }

    [Index(93)]
    public decimal HighDangerXGoalsAgainst { get; set; }

    [Index(94)]
    public decimal LowDangerGoalsAgainst { get; set; }

    [Index(95)]
    public decimal MediumDangerGoalsAgainst { get; set; }

    [Index(96)]
    public decimal HighDangerGoalsAgainst { get; set; }

    [Index(97)]
    public decimal ScoreAdjustedShotAttemptsAgainst { get; set; }

    [Index(98)]
    public decimal UnblockedShotAttemptsAgainst { get; set; }

    [Index(99)]
    public decimal ScoreAdjustedUnblockedShotAttemptsAgainst { get; set; }

    [Index(100)]
    public decimal DZoneGiveawaysAgainst { get; set; }

    [Index(101)]
    public decimal XGoalsFromXReboundsOfShotsAgainst { get; set; }

    [Index(102)]
    public decimal XGoalsFromActualReboundsOfShotsAgainst { get; set; }

    [Index(103)]
    public decimal ReboundXGoalsAgainst { get; set; }

    [Index(104)]
    public decimal TotalShotCreditAgainst { get; set; }

    [Index(105)]
    public decimal ScoreAdjustedTotalShotCreditAgainst { get; set; }

    [Index(106)]
    public decimal ScoreFlurryAdjustedTotalShotCreditAgainst { get; set; }
}
