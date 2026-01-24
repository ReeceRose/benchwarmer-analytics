using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for team-related DTO mapping and calculations.
/// </summary>
public static class TeamMappers
{
    public static decimal CalculatePPPercentage(TeamSeason? stats)
    {
        if (stats == null) return 0;
        var opportunities = (int)(stats.IceTime / 120);
        return opportunities > 0 ? (decimal)stats.GoalsFor / opportunities * 100 : 0;
    }

    public static decimal CalculatePKPercentage(TeamSeason? stats)
    {
        if (stats == null) return 0;
        var timesShorthanded = (int)(stats.IceTime / 120);
        return timesShorthanded > 0 ? (1 - (decimal)stats.GoalsAgainst / timesShorthanded) * 100 : 0;
    }

    public static PowerPlaySummaryDto CreatePowerPlaySummary(TeamSeason? stats, int? rank)
    {
        if (stats == null)
        {
            return new PowerPlaySummaryDto(0, 0, 0, 0, 0, 0, 0, 0, 0, null, 0);
        }

        var iceTimeSeconds = (int)stats.IceTime;
        var iceTimeMinutes = iceTimeSeconds / 60m;
        var opportunities = (int)(stats.IceTime / 120);
        var percentage = opportunities > 0 ? (decimal)stats.GoalsFor / opportunities * 100 : 0;
        var shootingPct = stats.ShotsOnGoalFor > 0 ? (decimal)stats.GoalsFor / stats.ShotsOnGoalFor * 100 : 0;
        var xgPer60 = iceTimeMinutes > 0 ? stats.XGoalsFor / iceTimeMinutes * 60 : 0;

        return new PowerPlaySummaryDto(
            opportunities,
            stats.GoalsFor,
            Math.Round(percentage, 1),
            Math.Round(stats.XGoalsFor, 1),
            Math.Round(xgPer60, 2),
            stats.ShotsOnGoalFor,
            Math.Round(shootingPct, 1),
            stats.HighDangerShotsFor,
            stats.HighDangerGoalsFor,
            rank,
            iceTimeSeconds
        );
    }

    public static PenaltyKillSummaryDto CreatePenaltyKillSummary(TeamSeason? stats, int? rank)
    {
        if (stats == null)
        {
            return new PenaltyKillSummaryDto(0, 0, 0, 0, 0, 0, 0, 0, 0, null, 0);
        }

        var iceTimeSeconds = (int)stats.IceTime;
        var iceTimeMinutes = iceTimeSeconds / 60m;
        var timesShorthanded = (int)(stats.IceTime / 120);
        var percentage = timesShorthanded > 0 ? (1 - (decimal)stats.GoalsAgainst / timesShorthanded) * 100 : 0;
        var savePct = stats.ShotsOnGoalAgainst > 0
            ? (decimal)(stats.ShotsOnGoalAgainst - stats.GoalsAgainst) / stats.ShotsOnGoalAgainst
            : 0;
        var xgaPer60 = iceTimeMinutes > 0 ? stats.XGoalsAgainst / iceTimeMinutes * 60 : 0;

        return new PenaltyKillSummaryDto(
            timesShorthanded,
            stats.GoalsAgainst,
            Math.Round(percentage, 1),
            Math.Round(stats.XGoalsAgainst, 1),
            Math.Round(xgaPer60, 2),
            stats.ShotsOnGoalAgainst,
            Math.Round(savePct, 1),
            stats.HighDangerShotsAgainst,
            stats.HighDangerGoalsAgainst,
            rank,
            iceTimeSeconds
        );
    }
}
