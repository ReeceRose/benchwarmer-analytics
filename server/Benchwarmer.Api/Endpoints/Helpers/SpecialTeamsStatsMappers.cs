using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Helper class for mapping special teams statistics to DTOs.
/// </summary>
public static class SpecialTeamsStatsMappers
{
    /// <summary>
    /// Creates a team special teams ranking DTO from PP and PK stats.
    /// </summary>
    public static TeamSpecialTeamsRankingDto CreateTeamRanking(
        Team team,
        TeamSeason? ppStats,
        TeamSeason? pkStats,
        int ppRank,
        int pkRank,
        int overallRank)
    {
        // Power Play calculations
        var ppIceTimeSeconds = ppStats != null ? (int)ppStats.IceTime : 0;
        var ppIceTimeMinutes = ppIceTimeSeconds / 60m;
        var ppOpportunities = ppIceTimeSeconds > 0 ? (int)(ppStats!.IceTime / 120) : 0;
        var ppGoals = ppStats?.GoalsFor ?? 0;
        var ppPct = ppOpportunities > 0 ? (decimal)ppGoals / ppOpportunities * 100 : 0;
        var ppXgPer60 = ppIceTimeMinutes > 0 && ppStats != null
            ? ppStats.XGoalsFor / ppIceTimeMinutes * 60
            : 0;
        var ppShPct = ppStats != null && ppStats.ShotsOnGoalFor > 0
            ? (decimal)ppStats.GoalsFor / ppStats.ShotsOnGoalFor * 100
            : 0;

        // Penalty Kill calculations
        var pkIceTimeSeconds = pkStats != null ? (int)pkStats.IceTime : 0;
        var pkIceTimeMinutes = pkIceTimeSeconds / 60m;
        var pkTimesShort = pkIceTimeSeconds > 0 ? (int)(pkStats!.IceTime / 120) : 0;
        var pkGoalsAgainst = pkStats?.GoalsAgainst ?? 0;
        var pkPct = pkTimesShort > 0 ? (1 - (decimal)pkGoalsAgainst / pkTimesShort) * 100 : 0;
        var pkXgaPer60 = pkIceTimeMinutes > 0 && pkStats != null
            ? pkStats.XGoalsAgainst / pkIceTimeMinutes * 60
            : 0;
        var pkSvPct = pkStats != null && pkStats.ShotsOnGoalAgainst > 0
            ? (decimal)(pkStats.ShotsOnGoalAgainst - pkStats.GoalsAgainst) / pkStats.ShotsOnGoalAgainst * 100
            : 0;

        return new TeamSpecialTeamsRankingDto(
            team.Abbreviation,
            team.Name,
            Math.Round(ppPct, 1),
            ppRank,
            ppGoals,
            ppOpportunities,
            Math.Round(ppXgPer60, 2),
            Math.Round(ppShPct, 1),
            Math.Round(pkPct, 1),
            pkRank,
            pkGoalsAgainst,
            pkTimesShort,
            Math.Round(pkXgaPer60, 2),
            Math.Round(pkSvPct, 1),
            Math.Round(ppPct + pkPct, 1),
            overallRank
        );
    }

    /// <summary>
    /// Creates a special teams player leader DTO from skater season stats.
    /// </summary>
    public static SpecialTeamsPlayerLeaderDto CreatePlayerLeader(SkaterSeason stats)
    {
        var iceTimeMinutes = stats.IceTimeSeconds / 60m;
        var points = stats.Goals + stats.Assists;
        var pointsPer60 = iceTimeMinutes > 0 ? points / iceTimeMinutes * 60 : 0;
        var xgPer60 = stats.ExpectedGoalsPer60 ?? 0;
        var goalsDiff = stats.Goals - (stats.ExpectedGoals ?? 0);

        return new SpecialTeamsPlayerLeaderDto(
            stats.PlayerId,
            stats.Player?.Name ?? "Unknown",
            stats.Team,
            stats.Player?.Position,
            stats.GamesPlayed,
            Math.Round(iceTimeMinutes, 1),
            stats.Goals,
            stats.Assists,
            points,
            Math.Round(pointsPer60, 2),
            Math.Round(xgPer60, 2),
            Math.Round(goalsDiff, 2)
        );
    }
}
