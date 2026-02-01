using Benchwarmer.Api.Dtos;
using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Services;

namespace Benchwarmer.Api.Endpoints.Helpers;

/// <summary>
/// Static helper class for mapping game-related entities to DTOs.
/// </summary>
public static class GameMappers
{
    /// <summary>
    /// Team code to name mapping.
    /// </summary>
    public static readonly Dictionary<string, string> TeamNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ANA"] = "Anaheim Ducks",
        ["ARI"] = "Arizona Coyotes",
        ["BOS"] = "Boston Bruins",
        ["BUF"] = "Buffalo Sabres",
        ["CAR"] = "Carolina Hurricanes",
        ["CBJ"] = "Columbus Blue Jackets",
        ["CGY"] = "Calgary Flames",
        ["CHI"] = "Chicago Blackhawks",
        ["COL"] = "Colorado Avalanche",
        ["DAL"] = "Dallas Stars",
        ["DET"] = "Detroit Red Wings",
        ["EDM"] = "Edmonton Oilers",
        ["FLA"] = "Florida Panthers",
        ["LAK"] = "Los Angeles Kings",
        ["MIN"] = "Minnesota Wild",
        ["MTL"] = "Montreal Canadiens",
        ["NJD"] = "New Jersey Devils",
        ["NSH"] = "Nashville Predators",
        ["NYI"] = "New York Islanders",
        ["NYR"] = "New York Rangers",
        ["OTT"] = "Ottawa Senators",
        ["PHI"] = "Philadelphia Flyers",
        ["PIT"] = "Pittsburgh Penguins",
        ["SEA"] = "Seattle Kraken",
        ["SJS"] = "San Jose Sharks",
        ["STL"] = "St. Louis Blues",
        ["TBL"] = "Tampa Bay Lightning",
        ["TOR"] = "Toronto Maple Leafs",
        ["UTA"] = "Utah Hockey Club",
        ["VAN"] = "Vancouver Canucks",
        ["VGK"] = "Vegas Golden Knights",
        ["WPG"] = "Winnipeg Jets",
        ["WSH"] = "Washington Capitals"
    };

    public static string? GetTeamName(string teamCode)
    {
        return TeamNames.TryGetValue(teamCode, out var name) ? name : null;
    }

    public static GameShotDto MapToShotDto(Shot shot)
    {
        return new GameShotDto(
            Period: shot.Period,
            GameSeconds: shot.GameTimeSeconds,
            ShooterName: shot.ShooterName,
            ShooterPlayerId: shot.ShooterPlayerId,
            ShooterPosition: shot.ShooterPosition,
            XCoord: shot.ArenaAdjustedXCoord ?? shot.XCoord ?? 0,
            YCoord: shot.ArenaAdjustedYCoord ?? shot.YCoord ?? 0,
            XGoal: shot.XGoal ?? 0,
            IsGoal: shot.IsGoal,
            ShotWasOnGoal: shot.ShotWasOnGoal,
            ShotType: shot.ShotType,
            ShotDistance: shot.ShotDistance ?? 0,
            ShotAngle: shot.ShotAngle ?? 0,
            ShotRebound: shot.ShotRebound,
            ShotRush: shot.ShotRush,
            HomeSkatersOnIce: shot.HomeSkatersOnIce,
            AwaySkatersOnIce: shot.AwaySkatersOnIce,
            GoalieName: shot.GoalieName
        );
    }

    public static List<BoxscoreSkaterDto> MapSkaters(NhlTeamPlayerStats teamStats)
    {
        var allSkaters = teamStats.Forwards.Concat(teamStats.Defense);
        return allSkaters
            .OrderByDescending(s => s.Points)
            .ThenByDescending(s => s.Goals)
            .ThenByDescending(s => s.ShotsOnGoal)
            .Select(s => new BoxscoreSkaterDto(
                PlayerId: s.PlayerId,
                JerseyNumber: s.SweaterNumber,
                Name: s.Name.Default,
                Position: s.Position,
                Goals: s.Goals,
                Assists: s.Assists,
                Points: s.Points,
                PlusMinus: s.PlusMinus,
                PenaltyMinutes: s.PenaltyMinutes,
                Hits: s.Hits,
                ShotsOnGoal: s.ShotsOnGoal,
                BlockedShots: s.BlockedShots,
                Giveaways: s.Giveaways,
                Takeaways: s.Takeaways,
                TimeOnIce: s.TimeOnIce,
                Shifts: s.Shifts,
                FaceoffPct: s.FaceoffWinningPct * 100
            ))
            .ToList();
    }

    public static List<BoxscoreGoalieDto> MapGoalies(NhlTeamPlayerStats teamStats)
    {
        return teamStats.Goalies
            .OrderByDescending(g => g.Starter)
            .Select(g => new BoxscoreGoalieDto(
                PlayerId: g.PlayerId,
                JerseyNumber: g.SweaterNumber,
                Name: g.Name.Default,
                ShotsAgainst: g.ShotsAgainst,
                Saves: g.Saves,
                GoalsAgainst: g.GoalsAgainst,
                SavePct: g.SavePct,
                TimeOnIce: g.TimeOnIce,
                Starter: g.Starter,
                Decision: g.Decision
            ))
            .ToList();
    }

    public static GameSummaryDto MapLiveGameToDto(
        NhlLiveGame game,
        GameStats? stats = null,
        NhlTeamStandings? homeStandings = null,
        NhlTeamStandings? awayStandings = null,
        string? seasonSeries = null)
    {
        var hasShotData = stats != null;
        var isLive = game.GameState is GameState.Live or GameState.Critical;
        var isCompleted = GameState.IsFinal(game.GameState);

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeam.Abbrev,
            TeamName: game.HomeTeam.Name?.Default ?? GetTeamName(game.HomeTeam.Abbrev),
            Goals: isLive || isCompleted ? game.HomeTeam.Score : null,
            Shots: stats?.HomeStats.TotalShots,
            ShotsOnGoal: isLive ? game.HomeTeam.ShotsOnGoal : stats?.HomeStats.ShotsOnGoal,
            ExpectedGoals: stats?.HomeStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.HomeStats.GoalsVsXgDiff,
            HighDangerChances: stats?.HomeStats.HighDangerChances,
            MediumDangerChances: stats?.HomeStats.MediumDangerChances,
            LowDangerChances: stats?.HomeStats.LowDangerChances,
            AvgShotDistance: stats?.HomeStats.AvgShotDistance,
            Record: game.HomeTeam.Record,
            Streak: homeStandings != null && !string.IsNullOrEmpty(homeStandings.StreakCode)
                ? $"{homeStandings.StreakCode}{homeStandings.StreakCount}" : null,
            HomeRecord: homeStandings != null
                ? $"{homeStandings.HomeWins}-{homeStandings.HomeLosses}-{homeStandings.HomeOtLosses}" : null,
            RoadRecord: homeStandings != null
                ? $"{homeStandings.RoadWins}-{homeStandings.RoadLosses}-{homeStandings.RoadOtLosses}" : null,
            Last10: homeStandings != null
                ? $"{homeStandings.L10Wins}-{homeStandings.L10Losses}-{homeStandings.L10OtLosses}" : null
        );

        var awayDto = new GameTeamDto(
            TeamCode: game.AwayTeam.Abbrev,
            TeamName: game.AwayTeam.Name?.Default ?? GetTeamName(game.AwayTeam.Abbrev),
            Goals: isLive || isCompleted ? game.AwayTeam.Score : null,
            Shots: stats?.AwayStats.TotalShots,
            ShotsOnGoal: isLive ? game.AwayTeam.ShotsOnGoal : stats?.AwayStats.ShotsOnGoal,
            ExpectedGoals: stats?.AwayStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.AwayStats.GoalsVsXgDiff,
            HighDangerChances: stats?.AwayStats.HighDangerChances,
            MediumDangerChances: stats?.AwayStats.MediumDangerChances,
            LowDangerChances: stats?.AwayStats.LowDangerChances,
            AvgShotDistance: stats?.AwayStats.AvgShotDistance,
            Record: game.AwayTeam.Record,
            Streak: awayStandings != null && !string.IsNullOrEmpty(awayStandings.StreakCode)
                ? $"{awayStandings.StreakCode}{awayStandings.StreakCount}" : null,
            HomeRecord: awayStandings != null
                ? $"{awayStandings.HomeWins}-{awayStandings.HomeLosses}-{awayStandings.HomeOtLosses}" : null,
            RoadRecord: awayStandings != null
                ? $"{awayStandings.RoadWins}-{awayStandings.RoadLosses}-{awayStandings.RoadOtLosses}" : null,
            Last10: awayStandings != null
                ? $"{awayStandings.L10Wins}-{awayStandings.L10Losses}-{awayStandings.L10OtLosses}" : null
        );

        var periods = stats?.Periods.Select(p => new GamePeriodStatsDto(
            p.Period,
            p.HomeShots,
            p.AwayShots,
            p.HomeGoals,
            p.AwayGoals,
            p.HomeXG,
            p.AwayXG
        )).ToList() ?? [];

        var goals = MapGoalsWithGwg(game.Goals, game.HomeTeam.Score, game.AwayTeam.Score, game.HomeTeam.Abbrev, isCompleted);

        DateOnly.TryParse(game.GameDate, out var gameDate);

        var normalizedGameState = game.GameState == GameState.FinalAlt ? GameState.Final : game.GameState;

        return new GameSummaryDto(
            GameId: game.Id.ToString(),
            GameDate: gameDate,
            GameState: normalizedGameState,
            StartTimeUtc: game.StartTimeUtc,
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodDescriptor?.PeriodType == "REG" ? null : game.PeriodDescriptor?.PeriodType,
            Periods: periods,
            HasShotData: hasShotData,
            CurrentPeriod: game.Period,
            TimeRemaining: game.Clock?.TimeRemaining,
            InIntermission: game.Clock?.InIntermission,
            Goals: goals,
            SeasonSeries: !string.IsNullOrEmpty(seasonSeries) ? seasonSeries : null
        );
    }

    public static GameSummaryDto MapToDto(
        Game game,
        GameStats? stats,
        NhlTeamStandings? homeStandings = null,
        NhlTeamStandings? awayStandings = null,
        string? seasonSeries = null,
        List<GameGoalDto>? goals = null)
    {
        var hasShotData = stats != null;
        var isCompleted = game.GameState == GameState.Final;
        var hasScores = game.HomeScore > 0 || game.AwayScore > 0;

        var homeDto = new GameTeamDto(
            TeamCode: game.HomeTeamCode,
            TeamName: GetTeamName(game.HomeTeamCode),
            Goals: (isCompleted || hasScores) ? game.HomeScore : null,
            Shots: stats?.HomeStats.TotalShots,
            ShotsOnGoal: stats?.HomeStats.ShotsOnGoal,
            ExpectedGoals: stats?.HomeStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.HomeStats.GoalsVsXgDiff,
            HighDangerChances: stats?.HomeStats.HighDangerChances,
            MediumDangerChances: stats?.HomeStats.MediumDangerChances,
            LowDangerChances: stats?.HomeStats.LowDangerChances,
            AvgShotDistance: stats?.HomeStats.AvgShotDistance,
            Record: homeStandings != null
                ? $"{homeStandings.Wins}-{homeStandings.Losses}-{homeStandings.OtLosses}" : null,
            Streak: homeStandings != null && !string.IsNullOrEmpty(homeStandings.StreakCode)
                ? $"{homeStandings.StreakCode}{homeStandings.StreakCount}" : null,
            HomeRecord: homeStandings != null
                ? $"{homeStandings.HomeWins}-{homeStandings.HomeLosses}-{homeStandings.HomeOtLosses}" : null,
            RoadRecord: homeStandings != null
                ? $"{homeStandings.RoadWins}-{homeStandings.RoadLosses}-{homeStandings.RoadOtLosses}" : null,
            Last10: homeStandings != null
                ? $"{homeStandings.L10Wins}-{homeStandings.L10Losses}-{homeStandings.L10OtLosses}" : null
        );

        var awayDto = new GameTeamDto(
            TeamCode: game.AwayTeamCode,
            TeamName: GetTeamName(game.AwayTeamCode),
            Goals: (isCompleted || hasScores) ? game.AwayScore : null,
            Shots: stats?.AwayStats.TotalShots,
            ShotsOnGoal: stats?.AwayStats.ShotsOnGoal,
            ExpectedGoals: stats?.AwayStats.ExpectedGoals,
            GoalsVsXgDiff: stats?.AwayStats.GoalsVsXgDiff,
            HighDangerChances: stats?.AwayStats.HighDangerChances,
            MediumDangerChances: stats?.AwayStats.MediumDangerChances,
            LowDangerChances: stats?.AwayStats.LowDangerChances,
            AvgShotDistance: stats?.AwayStats.AvgShotDistance,
            Record: awayStandings != null
                ? $"{awayStandings.Wins}-{awayStandings.Losses}-{awayStandings.OtLosses}" : null,
            Streak: awayStandings != null && !string.IsNullOrEmpty(awayStandings.StreakCode)
                ? $"{awayStandings.StreakCode}{awayStandings.StreakCount}" : null,
            HomeRecord: awayStandings != null
                ? $"{awayStandings.HomeWins}-{awayStandings.HomeLosses}-{awayStandings.HomeOtLosses}" : null,
            RoadRecord: awayStandings != null
                ? $"{awayStandings.RoadWins}-{awayStandings.RoadLosses}-{awayStandings.RoadOtLosses}" : null,
            Last10: awayStandings != null
                ? $"{awayStandings.L10Wins}-{awayStandings.L10Losses}-{awayStandings.L10OtLosses}" : null
        );

        var periods = stats?.Periods.Select(p => new GamePeriodStatsDto(
            p.Period,
            p.HomeShots,
            p.AwayShots,
            p.HomeGoals,
            p.AwayGoals,
            p.HomeXG,
            p.AwayXG
        )).ToList() ?? [];

        var effectiveGameState = game.GameState;

        return new GameSummaryDto(
            GameId: game.GameId,
            GameDate: game.GameDate,
            GameState: effectiveGameState,
            StartTimeUtc: game.StartTimeUtc?.ToString("o"),
            Home: homeDto,
            Away: awayDto,
            PeriodType: game.PeriodType == "REG" ? null : game.PeriodType,
            Periods: periods,
            HasShotData: hasShotData,
            Goals: goals,
            SeasonSeries: !string.IsNullOrEmpty(seasonSeries) ? seasonSeries : null
        );
    }

    /// <summary>
    /// Finds the index of the game-winning goal.
    /// The GWG is the goal that gave the winning team a lead they never lost.
    /// </summary>
    public static int? FindGwgIndex(
        IReadOnlyList<(bool IsHomeGoal, int HomeScoreAfter, int AwayScoreAfter)> goals,
        int finalHomeScore,
        int finalAwayScore)
    {
        var homeWins = finalHomeScore > finalAwayScore;
        var awayWins = finalAwayScore > finalHomeScore;

        if (!homeWins && !awayWins)
            return null;

        var losingTeamFinalScore = homeWins ? finalAwayScore : finalHomeScore;

        for (int i = 0; i < goals.Count; i++)
        {
            var goal = goals[i];
            var isWinningTeamGoal = (homeWins && goal.IsHomeGoal) || (awayWins && !goal.IsHomeGoal);

            if (isWinningTeamGoal)
            {
                var winningTeamScoreAfter = goal.IsHomeGoal ? goal.HomeScoreAfter : goal.AwayScoreAfter;
                if (winningTeamScoreAfter == losingTeamFinalScore + 1)
                {
                    return i;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Maps goals from live game data and determines which goal is the GWG.
    /// </summary>
    public static List<GameGoalDto> MapGoalsWithGwg(
        List<NhlGameGoal> goals,
        int? finalHomeScore,
        int? finalAwayScore,
        string homeTeamAbbrev,
        bool isGameCompleted)
    {
        if (goals.Count == 0 || finalHomeScore == null || finalAwayScore == null)
            return [];

        int? gwgIndex = null;
        if (isGameCompleted)
        {
            var goalData = goals
                .Select(g => (IsHomeGoal: g.TeamAbbrev == homeTeamAbbrev, HomeScoreAfter: g.HomeScore, AwayScoreAfter: g.AwayScore))
                .ToList();

            gwgIndex = FindGwgIndex(goalData, finalHomeScore.Value, finalAwayScore.Value);
        }

        return goals.Select((g, idx) => new GameGoalDto(
            Period: g.Period,
            TimeInPeriod: g.TimeInPeriod,
            ScorerName: g.Name?.Default ?? $"{g.FirstName?.Default} {g.LastName?.Default}".Trim(),
            ScorerId: g.PlayerId,
            TeamCode: g.TeamAbbrev ?? "",
            Strength: g.Strength ?? g.GoalModifier,
            Assists: g.Assists.Select(a => a.Name?.Default ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList(),
            IsGameWinningGoal: idx == gwgIndex
        )).ToList();
    }

    /// <summary>
    /// Maps goals from landing endpoint and determines which goal is the GWG.
    /// </summary>
    public static List<GameGoalDto> MapLandingGoalsWithGwg(NhlGameLanding landing, string homeTeamCode)
    {
        var allGoals = landing.Summary?.Scoring
            .SelectMany(p => p.Goals)
            .ToList() ?? [];

        if (allGoals.Count == 0)
            return [];

        var finalHomeScore = landing.HomeTeam.Score;
        var finalAwayScore = landing.AwayTeam.Score;

        if (finalHomeScore == null || finalAwayScore == null)
            return allGoals.Select(g => MapLandingGoalToDto(g, false)).ToList();

        var goalData = allGoals
            .Select(g => (IsHomeGoal: g.TeamAbbrev?.Default == homeTeamCode, HomeScoreAfter: g.HomeScore, AwayScoreAfter: g.AwayScore))
            .ToList();

        var gwgIndex = FindGwgIndex(goalData, finalHomeScore.Value, finalAwayScore.Value);

        return allGoals.Select((g, idx) => MapLandingGoalToDto(g, idx == gwgIndex)).ToList();
    }

    public static GameGoalDto MapLandingGoalToDto(NhlScoringGoal g, bool isGwg)
    {
        return new GameGoalDto(
            Period: g.Period,
            TimeInPeriod: g.TimeInPeriod,
            ScorerName: g.Name?.Default ?? $"{g.FirstName?.Default} {g.LastName?.Default}".Trim(),
            ScorerId: g.PlayerId,
            TeamCode: g.TeamAbbrev?.Default ?? "",
            Strength: g.Strength,
            Assists: g.Assists.Select(a => a.Name?.Default ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList(),
            IsGameWinningGoal: isGwg
        );
    }

    public static HotPlayerDto MapToHotPlayerDto(SkaterSeason s)
    {
        var differential = s.Goals - (s.ExpectedGoals ?? 0);
        var trend = differential > 0 ? "hot" : "cold";

        return new HotPlayerDto(
            PlayerId: s.PlayerId,
            Name: s.Player?.Name ?? $"Player {s.PlayerId}",
            Position: s.Player?.Position,
            Goals: s.Goals,
            Assists: s.Assists,
            ExpectedGoals: s.ExpectedGoals ?? 0,
            Differential: Math.Round(differential, 2),
            Trend: trend
        );
    }

    public static GoaliePreviewDto MapToGoaliePreviewDto(GoalieSeason g)
    {
        return new GoaliePreviewDto(
            PlayerId: g.PlayerId,
            Name: g.Player?.Name ?? $"Goalie {g.PlayerId}",
            GamesPlayed: g.GamesPlayed,
            SavePct: g.SavePercentage,
            GoalsAgainstAvg: g.GoalsAgainstAverage,
            GoalsSavedAboveExpected: g.GoalsSavedAboveExpected
        );
    }
}
