using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class TeamImporter(
    AppDbContext db,
    ITeamRepository teamRepository,
    ILogger<TeamImporter> logger)
{
    public async Task<int> ImportAsync(IEnumerable<TeamRecord> records)
    {
        var recordsList = records.ToList();
        var now = DateTime.UtcNow;

        // Group by team to upsert teams first
        var teamGroups = recordsList.GroupBy(r => r.Team);

        foreach (var group in teamGroups)
        {
            var first = group.First();

            // Upsert team via repository
            await teamRepository.UpsertAsync(new Team
            {
                Abbreviation = first.Team,
                Name = first.Name
            });
        }

        // Batch fetch all existing TeamSeasons in a single query
        var teams = recordsList.Select(r => r.Team).Distinct().ToList();
        var seasons = recordsList.Select(r => r.Season).Distinct().ToList();
        var situations = recordsList.Select(r => r.Situation).Distinct().ToList();

        var existingRecords = await db.TeamSeasons
            .Where(t => teams.Contains(t.TeamAbbreviation) &&
                        seasons.Contains(t.Season) &&
                        situations.Contains(t.Situation))
            .ToListAsync();

        // Build O(1) lookup dictionary with composite key
        var existingLookup = existingRecords
            .ToDictionary(t => (t.TeamAbbreviation, t.Season, t.Situation));

        // Upsert each season/situation record using dictionary lookup
        foreach (var record in recordsList)
        {
            var key = (record.Team, record.Season, record.Situation);

            if (existingLookup.TryGetValue(key, out var existing))
            {
                UpdateEntity(existing, record, now);
            }
            else
            {
                db.TeamSeasons.Add(MapToEntity(record, now));
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Imported {Count} team season records", recordsList.Count);
        return recordsList.Count;
    }

    private static TeamSeason MapToEntity(TeamRecord r, DateTime now)
    {
        return new TeamSeason
        {
            TeamAbbreviation = r.Team,
            Season = r.Season,
            Situation = r.Situation,
            GamesPlayed = r.GamesPlayed,
            IceTime = r.IceTime,
            XGoalsPercentage = r.XGoalsPercentage,
            CorsiPercentage = r.CorsiPercentage,
            FenwickPercentage = r.FenwickPercentage,
            XOnGoalFor = r.XOnGoalFor,
            XGoalsFor = r.XGoalsFor,
            XReboundsFor = r.XReboundsFor,
            XFreezeFor = r.XFreezeFor,
            XPlayStoppedFor = r.XPlayStoppedFor,
            XPlayContinuedInZoneFor = r.XPlayContinuedInZoneFor,
            XPlayContinuedOutsideZoneFor = r.XPlayContinuedOutsideZoneFor,
            FlurryAdjustedXGoalsFor = r.FlurryAdjustedXGoalsFor,
            ScoreVenueAdjustedXGoalsFor = r.ScoreVenueAdjustedXGoalsFor,
            FlurryScoreVenueAdjustedXGoalsFor = r.FlurryScoreVenueAdjustedXGoalsFor,
            ShotsOnGoalFor = (int)r.ShotsOnGoalFor,
            MissedShotsFor = (int)r.MissedShotsFor,
            BlockedShotAttemptsFor = (int)r.BlockedShotAttemptsFor,
            ShotAttemptsFor = (int)r.ShotAttemptsFor,
            GoalsFor = (int)r.GoalsFor,
            ReboundsFor = (int)r.ReboundsFor,
            ReboundGoalsFor = (int)r.ReboundGoalsFor,
            FreezeFor = (int)r.FreezeFor,
            PlayStoppedFor = (int)r.PlayStoppedFor,
            PlayContinuedInZoneFor = (int)r.PlayContinuedInZoneFor,
            PlayContinuedOutsideZoneFor = (int)r.PlayContinuedOutsideZoneFor,
            SavedShotsOnGoalFor = (int)r.SavedShotsOnGoalFor,
            SavedUnblockedShotAttemptsFor = (int)r.SavedUnblockedShotAttemptsFor,
            PenaltiesFor = (int)r.PenaltiesFor,
            PenaltyMinutesFor = (int)r.PenaltyMinutesFor,
            FaceOffsWonFor = (int)r.FaceOffsWonFor,
            HitsFor = (int)r.HitsFor,
            TakeawaysFor = (int)r.TakeawaysFor,
            GiveawaysFor = (int)r.GiveawaysFor,
            LowDangerShotsFor = (int)r.LowDangerShotsFor,
            MediumDangerShotsFor = (int)r.MediumDangerShotsFor,
            HighDangerShotsFor = (int)r.HighDangerShotsFor,
            LowDangerXGoalsFor = r.LowDangerXGoalsFor,
            MediumDangerXGoalsFor = r.MediumDangerXGoalsFor,
            HighDangerXGoalsFor = r.HighDangerXGoalsFor,
            LowDangerGoalsFor = (int)r.LowDangerGoalsFor,
            MediumDangerGoalsFor = (int)r.MediumDangerGoalsFor,
            HighDangerGoalsFor = (int)r.HighDangerGoalsFor,
            ScoreAdjustedShotAttemptsFor = r.ScoreAdjustedShotAttemptsFor,
            UnblockedShotAttemptsFor = r.UnblockedShotAttemptsFor,
            ScoreAdjustedUnblockedShotAttemptsFor = r.ScoreAdjustedUnblockedShotAttemptsFor,
            DZoneGiveawaysFor = (int)r.DZoneGiveawaysFor,
            XGoalsFromXReboundsOfShotsFor = r.XGoalsFromXReboundsOfShotsFor,
            XGoalsFromActualReboundsOfShotsFor = r.XGoalsFromActualReboundsOfShotsFor,
            ReboundXGoalsFor = r.ReboundXGoalsFor,
            TotalShotCreditFor = r.TotalShotCreditFor,
            ScoreAdjustedTotalShotCreditFor = r.ScoreAdjustedTotalShotCreditFor,
            ScoreFlurryAdjustedTotalShotCreditFor = r.ScoreFlurryAdjustedTotalShotCreditFor,
            XOnGoalAgainst = r.XOnGoalAgainst,
            XGoalsAgainst = r.XGoalsAgainst,
            XReboundsAgainst = r.XReboundsAgainst,
            XFreezeAgainst = r.XFreezeAgainst,
            XPlayStoppedAgainst = r.XPlayStoppedAgainst,
            XPlayContinuedInZoneAgainst = r.XPlayContinuedInZoneAgainst,
            XPlayContinuedOutsideZoneAgainst = r.XPlayContinuedOutsideZoneAgainst,
            FlurryAdjustedXGoalsAgainst = r.FlurryAdjustedXGoalsAgainst,
            ScoreVenueAdjustedXGoalsAgainst = r.ScoreVenueAdjustedXGoalsAgainst,
            FlurryScoreVenueAdjustedXGoalsAgainst = r.FlurryScoreVenueAdjustedXGoalsAgainst,
            ShotsOnGoalAgainst = (int)r.ShotsOnGoalAgainst,
            MissedShotsAgainst = (int)r.MissedShotsAgainst,
            BlockedShotAttemptsAgainst = (int)r.BlockedShotAttemptsAgainst,
            ShotAttemptsAgainst = (int)r.ShotAttemptsAgainst,
            GoalsAgainst = (int)r.GoalsAgainst,
            ReboundsAgainst = (int)r.ReboundsAgainst,
            ReboundGoalsAgainst = (int)r.ReboundGoalsAgainst,
            FreezeAgainst = (int)r.FreezeAgainst,
            PlayStoppedAgainst = (int)r.PlayStoppedAgainst,
            PlayContinuedInZoneAgainst = (int)r.PlayContinuedInZoneAgainst,
            PlayContinuedOutsideZoneAgainst = (int)r.PlayContinuedOutsideZoneAgainst,
            SavedShotsOnGoalAgainst = (int)r.SavedShotsOnGoalAgainst,
            SavedUnblockedShotAttemptsAgainst = (int)r.SavedUnblockedShotAttemptsAgainst,
            PenaltiesAgainst = (int)r.PenaltiesAgainst,
            PenaltyMinutesAgainst = (int)r.PenaltyMinutesAgainst,
            FaceOffsWonAgainst = (int)r.FaceOffsWonAgainst,
            HitsAgainst = (int)r.HitsAgainst,
            TakeawaysAgainst = (int)r.TakeawaysAgainst,
            GiveawaysAgainst = (int)r.GiveawaysAgainst,
            LowDangerShotsAgainst = (int)r.LowDangerShotsAgainst,
            MediumDangerShotsAgainst = (int)r.MediumDangerShotsAgainst,
            HighDangerShotsAgainst = (int)r.HighDangerShotsAgainst,
            LowDangerXGoalsAgainst = r.LowDangerXGoalsAgainst,
            MediumDangerXGoalsAgainst = r.MediumDangerXGoalsAgainst,
            HighDangerXGoalsAgainst = r.HighDangerXGoalsAgainst,
            LowDangerGoalsAgainst = (int)r.LowDangerGoalsAgainst,
            MediumDangerGoalsAgainst = (int)r.MediumDangerGoalsAgainst,
            HighDangerGoalsAgainst = (int)r.HighDangerGoalsAgainst,
            ScoreAdjustedShotAttemptsAgainst = r.ScoreAdjustedShotAttemptsAgainst,
            UnblockedShotAttemptsAgainst = r.UnblockedShotAttemptsAgainst,
            ScoreAdjustedUnblockedShotAttemptsAgainst = r.ScoreAdjustedUnblockedShotAttemptsAgainst,
            DZoneGiveawaysAgainst = (int)r.DZoneGiveawaysAgainst,
            XGoalsFromXReboundsOfShotsAgainst = r.XGoalsFromXReboundsOfShotsAgainst,
            XGoalsFromActualReboundsOfShotsAgainst = r.XGoalsFromActualReboundsOfShotsAgainst,
            ReboundXGoalsAgainst = r.ReboundXGoalsAgainst,
            TotalShotCreditAgainst = r.TotalShotCreditAgainst,
            ScoreAdjustedTotalShotCreditAgainst = r.ScoreAdjustedTotalShotCreditAgainst,
            ScoreFlurryAdjustedTotalShotCreditAgainst = r.ScoreFlurryAdjustedTotalShotCreditAgainst,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    private static void UpdateEntity(TeamSeason e, TeamRecord r, DateTime now)
    {
        e.GamesPlayed = r.GamesPlayed;
        e.IceTime = r.IceTime;
        e.XGoalsPercentage = r.XGoalsPercentage;
        e.CorsiPercentage = r.CorsiPercentage;
        e.FenwickPercentage = r.FenwickPercentage;
        e.XOnGoalFor = r.XOnGoalFor;
        e.XGoalsFor = r.XGoalsFor;
        e.XReboundsFor = r.XReboundsFor;
        e.XFreezeFor = r.XFreezeFor;
        e.XPlayStoppedFor = r.XPlayStoppedFor;
        e.XPlayContinuedInZoneFor = r.XPlayContinuedInZoneFor;
        e.XPlayContinuedOutsideZoneFor = r.XPlayContinuedOutsideZoneFor;
        e.FlurryAdjustedXGoalsFor = r.FlurryAdjustedXGoalsFor;
        e.ScoreVenueAdjustedXGoalsFor = r.ScoreVenueAdjustedXGoalsFor;
        e.FlurryScoreVenueAdjustedXGoalsFor = r.FlurryScoreVenueAdjustedXGoalsFor;
        e.ShotsOnGoalFor = (int)r.ShotsOnGoalFor;
        e.MissedShotsFor = (int)r.MissedShotsFor;
        e.BlockedShotAttemptsFor = (int)r.BlockedShotAttemptsFor;
        e.ShotAttemptsFor = (int)r.ShotAttemptsFor;
        e.GoalsFor = (int)r.GoalsFor;
        e.ReboundsFor = (int)r.ReboundsFor;
        e.ReboundGoalsFor = (int)r.ReboundGoalsFor;
        e.FreezeFor = (int)r.FreezeFor;
        e.PlayStoppedFor = (int)r.PlayStoppedFor;
        e.PlayContinuedInZoneFor = (int)r.PlayContinuedInZoneFor;
        e.PlayContinuedOutsideZoneFor = (int)r.PlayContinuedOutsideZoneFor;
        e.SavedShotsOnGoalFor = (int)r.SavedShotsOnGoalFor;
        e.SavedUnblockedShotAttemptsFor = (int)r.SavedUnblockedShotAttemptsFor;
        e.PenaltiesFor = (int)r.PenaltiesFor;
        e.PenaltyMinutesFor = (int)r.PenaltyMinutesFor;
        e.FaceOffsWonFor = (int)r.FaceOffsWonFor;
        e.HitsFor = (int)r.HitsFor;
        e.TakeawaysFor = (int)r.TakeawaysFor;
        e.GiveawaysFor = (int)r.GiveawaysFor;
        e.LowDangerShotsFor = (int)r.LowDangerShotsFor;
        e.MediumDangerShotsFor = (int)r.MediumDangerShotsFor;
        e.HighDangerShotsFor = (int)r.HighDangerShotsFor;
        e.LowDangerXGoalsFor = r.LowDangerXGoalsFor;
        e.MediumDangerXGoalsFor = r.MediumDangerXGoalsFor;
        e.HighDangerXGoalsFor = r.HighDangerXGoalsFor;
        e.LowDangerGoalsFor = (int)r.LowDangerGoalsFor;
        e.MediumDangerGoalsFor = (int)r.MediumDangerGoalsFor;
        e.HighDangerGoalsFor = (int)r.HighDangerGoalsFor;
        e.ScoreAdjustedShotAttemptsFor = r.ScoreAdjustedShotAttemptsFor;
        e.UnblockedShotAttemptsFor = r.UnblockedShotAttemptsFor;
        e.ScoreAdjustedUnblockedShotAttemptsFor = r.ScoreAdjustedUnblockedShotAttemptsFor;
        e.DZoneGiveawaysFor = (int)r.DZoneGiveawaysFor;
        e.XGoalsFromXReboundsOfShotsFor = r.XGoalsFromXReboundsOfShotsFor;
        e.XGoalsFromActualReboundsOfShotsFor = r.XGoalsFromActualReboundsOfShotsFor;
        e.ReboundXGoalsFor = r.ReboundXGoalsFor;
        e.TotalShotCreditFor = r.TotalShotCreditFor;
        e.ScoreAdjustedTotalShotCreditFor = r.ScoreAdjustedTotalShotCreditFor;
        e.ScoreFlurryAdjustedTotalShotCreditFor = r.ScoreFlurryAdjustedTotalShotCreditFor;
        e.XOnGoalAgainst = r.XOnGoalAgainst;
        e.XGoalsAgainst = r.XGoalsAgainst;
        e.XReboundsAgainst = r.XReboundsAgainst;
        e.XFreezeAgainst = r.XFreezeAgainst;
        e.XPlayStoppedAgainst = r.XPlayStoppedAgainst;
        e.XPlayContinuedInZoneAgainst = r.XPlayContinuedInZoneAgainst;
        e.XPlayContinuedOutsideZoneAgainst = r.XPlayContinuedOutsideZoneAgainst;
        e.FlurryAdjustedXGoalsAgainst = r.FlurryAdjustedXGoalsAgainst;
        e.ScoreVenueAdjustedXGoalsAgainst = r.ScoreVenueAdjustedXGoalsAgainst;
        e.FlurryScoreVenueAdjustedXGoalsAgainst = r.FlurryScoreVenueAdjustedXGoalsAgainst;
        e.ShotsOnGoalAgainst = (int)r.ShotsOnGoalAgainst;
        e.MissedShotsAgainst = (int)r.MissedShotsAgainst;
        e.BlockedShotAttemptsAgainst = (int)r.BlockedShotAttemptsAgainst;
        e.ShotAttemptsAgainst = (int)r.ShotAttemptsAgainst;
        e.GoalsAgainst = (int)r.GoalsAgainst;
        e.ReboundsAgainst = (int)r.ReboundsAgainst;
        e.ReboundGoalsAgainst = (int)r.ReboundGoalsAgainst;
        e.FreezeAgainst = (int)r.FreezeAgainst;
        e.PlayStoppedAgainst = (int)r.PlayStoppedAgainst;
        e.PlayContinuedInZoneAgainst = (int)r.PlayContinuedInZoneAgainst;
        e.PlayContinuedOutsideZoneAgainst = (int)r.PlayContinuedOutsideZoneAgainst;
        e.SavedShotsOnGoalAgainst = (int)r.SavedShotsOnGoalAgainst;
        e.SavedUnblockedShotAttemptsAgainst = (int)r.SavedUnblockedShotAttemptsAgainst;
        e.PenaltiesAgainst = (int)r.PenaltiesAgainst;
        e.PenaltyMinutesAgainst = (int)r.PenaltyMinutesAgainst;
        e.FaceOffsWonAgainst = (int)r.FaceOffsWonAgainst;
        e.HitsAgainst = (int)r.HitsAgainst;
        e.TakeawaysAgainst = (int)r.TakeawaysAgainst;
        e.GiveawaysAgainst = (int)r.GiveawaysAgainst;
        e.LowDangerShotsAgainst = (int)r.LowDangerShotsAgainst;
        e.MediumDangerShotsAgainst = (int)r.MediumDangerShotsAgainst;
        e.HighDangerShotsAgainst = (int)r.HighDangerShotsAgainst;
        e.LowDangerXGoalsAgainst = r.LowDangerXGoalsAgainst;
        e.MediumDangerXGoalsAgainst = r.MediumDangerXGoalsAgainst;
        e.HighDangerXGoalsAgainst = r.HighDangerXGoalsAgainst;
        e.LowDangerGoalsAgainst = (int)r.LowDangerGoalsAgainst;
        e.MediumDangerGoalsAgainst = (int)r.MediumDangerGoalsAgainst;
        e.HighDangerGoalsAgainst = (int)r.HighDangerGoalsAgainst;
        e.ScoreAdjustedShotAttemptsAgainst = r.ScoreAdjustedShotAttemptsAgainst;
        e.UnblockedShotAttemptsAgainst = r.UnblockedShotAttemptsAgainst;
        e.ScoreAdjustedUnblockedShotAttemptsAgainst = r.ScoreAdjustedUnblockedShotAttemptsAgainst;
        e.DZoneGiveawaysAgainst = (int)r.DZoneGiveawaysAgainst;
        e.XGoalsFromXReboundsOfShotsAgainst = r.XGoalsFromXReboundsOfShotsAgainst;
        e.XGoalsFromActualReboundsOfShotsAgainst = r.XGoalsFromActualReboundsOfShotsAgainst;
        e.ReboundXGoalsAgainst = r.ReboundXGoalsAgainst;
        e.TotalShotCreditAgainst = r.TotalShotCreditAgainst;
        e.ScoreAdjustedTotalShotCreditAgainst = r.ScoreAdjustedTotalShotCreditAgainst;
        e.ScoreFlurryAdjustedTotalShotCreditAgainst = r.ScoreFlurryAdjustedTotalShotCreditAgainst;
        e.UpdatedAt = now;
    }
}
