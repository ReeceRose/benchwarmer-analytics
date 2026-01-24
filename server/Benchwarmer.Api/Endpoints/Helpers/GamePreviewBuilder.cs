using Benchwarmer.Api.Dtos;
using Benchwarmer.Data.Entities;
using Benchwarmer.Ingestion.Services;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for building game preview DTOs.
/// </summary>
public static class GamePreviewBuilder
{
    public static HeadToHeadDto BuildHeadToHeadRecord(
        IReadOnlyList<NhlClubScheduleGame> games,
        string homeTeam,
        string awayTeam)
    {
        var homeWins = 0;
        var awayWins = 0;
        var otLosses = 0;

        foreach (var g in games)
        {
            var gameHomeTeam = g.HomeTeam.Abbrev;
            var homeScore = g.HomeTeam.Score ?? 0;
            var awayScore = g.AwayTeam.Score ?? 0;
            var homeWon = homeScore > awayScore;
            var isOt = g.PeriodDescriptor?.PeriodType is "OT" or "SO";

            if (gameHomeTeam == homeTeam)
            {
                if (homeWon) homeWins++;
                else if (isOt) otLosses++;
                else awayWins++;
            }
            else
            {
                if (homeWon) awayWins++;
                else if (isOt) otLosses++;
                else homeWins++;
            }
        }

        var lastFive = games.Take(5).Select(g =>
        {
            var homeScore = g.HomeTeam.Score ?? 0;
            var awayScore = g.AwayTeam.Score ?? 0;
            return new PastGameDto(
                Date: DateOnly.Parse(g.GameDate),
                Score: $"{g.HomeTeam.Abbrev} {homeScore} - {g.AwayTeam.Abbrev} {awayScore}",
                Winner: homeScore > awayScore ? g.HomeTeam.Abbrev : g.AwayTeam.Abbrev,
                OvertimeType: g.PeriodDescriptor?.PeriodType is "OT" or "SO" ? g.PeriodDescriptor.PeriodType : null
            );
        }).ToList();

        return new HeadToHeadDto(
            Season: new SeasonRecordDto(homeWins, awayWins, otLosses),
            LastFive: lastFive
        );
    }

    public static TeamPreviewStatsDto BuildTeamPreviewStats(
        string teamCode,
        TeamSeason? allSituation,
        NhlTeamStandings? standings,
        NhlTeamSpecialTeams? specialTeams)
    {
        if (allSituation == null)
        {
            return new TeamPreviewStatsDto(teamCode, 0, 0, 0, null, null, null, null, null, null, null, null);
        }

        var gp = allSituation.GamesPlayed;
        var xgfPerGame = gp > 0 ? Math.Round(allSituation.XGoalsFor / gp, 2) : 0;
        var xgaPerGame = gp > 0 ? Math.Round(allSituation.XGoalsAgainst / gp, 2) : 0;

        decimal? ppPct = specialTeams?.PowerPlayPct != null
            ? Math.Round(specialTeams.PowerPlayPct.Value * 100, 1)
            : null;
        decimal? pkPct = specialTeams?.PenaltyKillPct != null
            ? Math.Round(specialTeams.PenaltyKillPct.Value * 100, 1)
            : null;

        string? streak = standings != null && !string.IsNullOrEmpty(standings.StreakCode)
            ? $"{standings.StreakCode}{standings.StreakCount}"
            : null;

        string? homeRecord = standings != null
            ? $"{standings.HomeWins}-{standings.HomeLosses}-{standings.HomeOtLosses}"
            : null;
        string? roadRecord = standings != null
            ? $"{standings.RoadWins}-{standings.RoadLosses}-{standings.RoadOtLosses}"
            : null;
        string? last10 = standings != null
            ? $"{standings.L10Wins}-{standings.L10Losses}-{standings.L10OtLosses}"
            : null;

        return new TeamPreviewStatsDto(
            TeamCode: teamCode,
            GamesPlayed: gp,
            XGoalsFor: xgfPerGame,
            XGoalsAgainst: xgaPerGame,
            XGoalsPct: allSituation.XGoalsPercentage,
            CorsiPct: allSituation.CorsiPercentage,
            PowerPlayPct: ppPct,
            PenaltyKillPct: pkPct,
            Streak: streak,
            HomeRecord: homeRecord,
            RoadRecord: roadRecord,
            Last10: last10
        );
    }

    public static List<GoalieRecentFormDto> AggregateGoalieStatsFromBoxscores(
        string teamCode,
        List<NhlClubScheduleGame> games,
        Dictionary<string, NhlBoxscore> boxscores)
    {
        var goalieStats = new Dictionary<int, (string Name, int Games, int ShotsAgainst, int GoalsAgainst)>();

        foreach (var game in games)
        {
            if (!boxscores.TryGetValue(game.Id.ToString(), out var boxscore))
                continue;

            var isHome = boxscore.HomeTeam?.Abbrev == teamCode;
            var teamPlayers = isHome ? boxscore.PlayerByGameStats?.HomeTeam : boxscore.PlayerByGameStats?.AwayTeam;

            if (teamPlayers?.Goalies == null)
                continue;

            foreach (var goalie in teamPlayers.Goalies)
            {
                var saveShotsAgainst = goalie.SaveShotsAgainst;
                if (string.IsNullOrEmpty(saveShotsAgainst))
                    continue;

                var parts = saveShotsAgainst.Split('/');
                if (parts.Length != 2 || !int.TryParse(parts[1], out var shots))
                    continue;

                var goalsAgainst = goalie.GoalsAgainst;
                var name = $"{goalie.Name.Default}";

                if (goalieStats.TryGetValue(goalie.PlayerId, out var existing))
                {
                    goalieStats[goalie.PlayerId] = (name, existing.Games + 1, existing.ShotsAgainst + shots, existing.GoalsAgainst + goalsAgainst);
                }
                else
                {
                    goalieStats[goalie.PlayerId] = (name, 1, shots, goalsAgainst);
                }
            }
        }

        return goalieStats
            .Select(kvp =>
            {
                var (name, gamesPlayed, shotsAgainst, goalsAgainst) = kvp.Value;
                var savePct = shotsAgainst > 0 ? Math.Round((decimal)(shotsAgainst - goalsAgainst) / shotsAgainst, 3) : (decimal?)null;

                return new GoalieRecentFormDto(
                    PlayerId: kvp.Key,
                    Name: name,
                    GamesPlayed: gamesPlayed,
                    SavePct: savePct,
                    ShotsAgainst: shotsAgainst,
                    GoalsAgainst: goalsAgainst
                );
            })
            .OrderByDescending(g => g.GamesPlayed)
            .ToList();
    }
}
