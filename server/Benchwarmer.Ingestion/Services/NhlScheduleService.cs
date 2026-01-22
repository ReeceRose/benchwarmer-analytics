using System.Text.Json;
using System.Text.Json.Serialization;
using Benchwarmer.Data.Entities;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class NhlScheduleService(HttpClient httpClient, ILogger<NhlScheduleService> logger)
{
    private const string BaseUrl = "https://api-web.nhle.com/v1";
    private const string StatsApiUrl = "https://api.nhle.com/stats/rest/en";

    public async Task<IReadOnlyList<Game>> GetGamesForDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/schedule/{date:yyyy-MM-dd}";
        logger.LogInformation("Fetching NHL schedule for {Date} from {Url}", date, url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL schedule request failed: HTTP {StatusCode}", response.StatusCode);
                return [];
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var schedule = JsonSerializer.Deserialize<NhlScheduleResponse>(json);

            if (schedule?.GameWeek == null || schedule.GameWeek.Count == 0)
            {
                logger.LogInformation("No games found for {Date}", date);
                return [];
            }

            var games = new List<Game>();

            foreach (var day in schedule.GameWeek)
            {
                if (!DateOnly.TryParse(day.Date, out var gameDate))
                    continue;

                foreach (var game in day.Games)
                {
                    games.Add(new Game
                    {
                        GameId = game.Id.ToString(),
                        Season = ParseSeason(game.Season),
                        GameType = game.GameType,
                        GameDate = gameDate,
                        StartTimeUtc = ParseStartTime(game.StartTimeUtc),
                        HomeTeamCode = game.HomeTeam.Abbrev,
                        AwayTeamCode = game.AwayTeam.Abbrev,
                        HomeScore = game.HomeTeam.Score ?? 0,
                        AwayScore = game.AwayTeam.Score ?? 0,
                        GameState = game.GameState,
                        PeriodType = game.PeriodDescriptor?.PeriodType
                    });
                }
            }

            logger.LogInformation("Found {Count} games for week starting {Date}", games.Count, date);
            return games;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL schedule for {Date}", date);
            return [];
        }
    }

    public async Task<IReadOnlyList<Game>> GetGamesForDateRangeAsync(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
    {
        var allGames = new List<Game>();
        var currentDate = startDate;

        while (currentDate <= endDate)
        {
            var games = await GetGamesForDateAsync(currentDate, cancellationToken);
            allGames.AddRange(games.Where(g => g.GameDate >= startDate && g.GameDate <= endDate));

            // NHL API returns a week at a time, so skip ahead
            currentDate = currentDate.AddDays(7);
        }

        return allGames
            .DistinctBy(g => g.GameId)
            .OrderBy(g => g.GameDate)
            .ThenBy(g => g.GameId)
            .ToList();
    }

    public async Task<NhlBoxscore?> GetBoxscoreAsync(string gameId, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/gamecenter/{gameId}/boxscore";
        logger.LogInformation("Fetching NHL boxscore for game {GameId} from {Url}", gameId, url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL boxscore request failed: HTTP {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var boxscore = JsonSerializer.Deserialize<NhlBoxscore>(json);

            return boxscore;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL boxscore for game {GameId}", gameId);
            return null;
        }
    }

    public async Task<NhlGameLanding?> GetGameLandingAsync(string gameId, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/gamecenter/{gameId}/landing";
        logger.LogInformation("Fetching NHL game landing for game {GameId} from {Url}", gameId, url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL game landing request failed: HTTP {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var landing = JsonSerializer.Deserialize<NhlGameLanding>(json);

            return landing;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL game landing for game {GameId}", gameId);
            return null;
        }
    }

    public async Task<IReadOnlyList<NhlClubScheduleGame>> GetTeamSeasonGamesAsync(
        string teamAbbrev,
        int season,
        CancellationToken cancellationToken = default)
    {
        // Season format: 20252026 for the 2025-26 season
        var seasonCode = $"{season}{season + 1}";
        var url = $"{BaseUrl}/club-schedule-season/{teamAbbrev}/{seasonCode}";
        logger.LogInformation("Fetching NHL club schedule for {Team} season {Season} from {Url}", teamAbbrev, season, url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL club schedule request failed: HTTP {StatusCode}", response.StatusCode);
                return [];
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var schedule = JsonSerializer.Deserialize<NhlClubScheduleResponse>(json);

            return schedule?.Games ?? [];
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL club schedule for {Team} season {Season}", teamAbbrev, season);
            return [];
        }
    }

    public async Task<NhlLiveScoresResponse?> GetLiveScoresAsync(CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/score/now";
        logger.LogInformation("Fetching NHL live scores from {Url}", url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL live scores request failed: HTTP {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var scores = JsonSerializer.Deserialize<NhlLiveScoresResponse>(json);

            return scores;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL live scores");
            return null;
        }
    }

    public async Task<IReadOnlyDictionary<string, NhlTeamStandings>> GetStandingsAsync(
        CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/standings/now";
        logger.LogInformation("Fetching NHL standings from {Url}", url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL standings request failed: HTTP {StatusCode}", response.StatusCode);
                return new Dictionary<string, NhlTeamStandings>();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var standingsResponse = JsonSerializer.Deserialize<NhlStandingsResponse>(json);

            if (standingsResponse?.Standings == null)
            {
                return new Dictionary<string, NhlTeamStandings>();
            }

            return standingsResponse.Standings
                .Where(t => t.TeamAbbrev?.Default != null)
                .ToDictionary(t => t.TeamAbbrev!.Default!, t => t);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL standings");
            return new Dictionary<string, NhlTeamStandings>();
        }
    }

    public async Task<IReadOnlyDictionary<string, NhlTeamSpecialTeams>> GetTeamSpecialTeamsAsync(
        int season,
        CancellationToken cancellationToken = default)
    {
        var seasonId = $"{season}{season + 1}";
        var url = $"{StatsApiUrl}/team/summary?cayenneExp=seasonId={seasonId}&cayenneExp=gameTypeId=2";
        logger.LogInformation("Fetching NHL team special teams stats for season {Season} from {Url}", season, url);

        try
        {
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("NHL team special teams stats request failed: HTTP {StatusCode}", response.StatusCode);
                return new Dictionary<string, NhlTeamSpecialTeams>();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var statsResponse = JsonSerializer.Deserialize<NhlTeamStatsResponse>(json);

            if (statsResponse?.Data == null)
            {
                return new Dictionary<string, NhlTeamSpecialTeams>();
            }

            // Map team full names to abbreviations
            return statsResponse.Data
                .Where(t => !string.IsNullOrEmpty(t.TeamFullName))
                .ToDictionary(
                    t => TeamNameToAbbrev(t.TeamFullName!),
                    t => new NhlTeamSpecialTeams
                    {
                        PowerPlayPct = t.PowerPlayPct,
                        PenaltyKillPct = t.PenaltyKillPct,
                        FaceoffWinPct = t.FaceoffWinPct
                    });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching NHL team special teams stats for season {Season}", season);
            return new Dictionary<string, NhlTeamSpecialTeams>();
        }
    }

    private static string TeamNameToAbbrev(string teamFullName) => teamFullName switch
    {
        "Anaheim Ducks" => "ANA",
        "Boston Bruins" => "BOS",
        "Buffalo Sabres" => "BUF",
        "Calgary Flames" => "CGY",
        "Carolina Hurricanes" => "CAR",
        "Chicago Blackhawks" => "CHI",
        "Colorado Avalanche" => "COL",
        "Columbus Blue Jackets" => "CBJ",
        "Dallas Stars" => "DAL",
        "Detroit Red Wings" => "DET",
        "Edmonton Oilers" => "EDM",
        "Florida Panthers" => "FLA",
        "Los Angeles Kings" => "LAK",
        "Minnesota Wild" => "MIN",
        "Montréal Canadiens" => "MTL",
        "Nashville Predators" => "NSH",
        "New Jersey Devils" => "NJD",
        "New York Islanders" => "NYI",
        "New York Rangers" => "NYR",
        "Ottawa Senators" => "OTT",
        "Philadelphia Flyers" => "PHI",
        "Pittsburgh Penguins" => "PIT",
        "San Jose Sharks" => "SJS",
        "Seattle Kraken" => "SEA",
        "St. Louis Blues" => "STL",
        "Tampa Bay Lightning" => "TBL",
        "Toronto Maple Leafs" => "TOR",
        "Utah Hockey Club" => "UTA",
        "Vancouver Canucks" => "VAN",
        "Vegas Golden Knights" => "VGK",
        "Washington Capitals" => "WSH",
        "Winnipeg Jets" => "WPG",
        _ => teamFullName[..3].ToUpperInvariant() // Fallback
    };

    private static int ParseSeason(int seasonCode)
    {
        // Season code is like 20242025, we want 2024
        return seasonCode / 10000;
    }

    private static DateTime? ParseStartTime(string? startTimeUtc)
    {
        if (string.IsNullOrEmpty(startTimeUtc))
            return null;

        // Parse as UTC using round-trip format to preserve the 'Z' suffix
        if (DateTime.TryParse(startTimeUtc, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
            return parsed.ToUniversalTime();

        return null;
    }
}

#region NHL API Response Models

internal class NhlScheduleResponse
{
    [JsonPropertyName("gameWeek")]
    public List<NhlGameDay>? GameWeek { get; set; }
}

internal class NhlGameDay
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("games")]
    public List<NhlGame> Games { get; set; } = [];
}

internal class NhlGame
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("season")]
    public int Season { get; set; }

    [JsonPropertyName("gameType")]
    public int GameType { get; set; }

    [JsonPropertyName("gameState")]
    public string GameState { get; set; } = "";

    [JsonPropertyName("startTimeUTC")]
    public string? StartTimeUtc { get; set; }

    [JsonPropertyName("homeTeam")]
    public NhlTeam HomeTeam { get; set; } = new();

    [JsonPropertyName("awayTeam")]
    public NhlTeam AwayTeam { get; set; } = new();

    [JsonPropertyName("periodDescriptor")]
    public NhlPeriodDescriptor? PeriodDescriptor { get; set; }
}

internal class NhlTeam
{
    [JsonPropertyName("abbrev")]
    public string Abbrev { get; set; } = "";

    [JsonPropertyName("score")]
    public int? Score { get; set; }
}

public class NhlPeriodDescriptor
{
    [JsonPropertyName("periodType")]
    public string? PeriodType { get; set; }
}

#endregion

#region NHL Club Schedule Response Models

public class NhlClubScheduleResponse
{
    [JsonPropertyName("games")]
    public List<NhlClubScheduleGame> Games { get; set; } = [];
}

public class NhlClubScheduleGame
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("season")]
    public int Season { get; set; }

    [JsonPropertyName("gameType")]
    public int GameType { get; set; }

    [JsonPropertyName("gameDate")]
    public string GameDate { get; set; } = "";

    [JsonPropertyName("gameState")]
    public string GameState { get; set; } = "";

    [JsonPropertyName("homeTeam")]
    public NhlClubScheduleTeam HomeTeam { get; set; } = new();

    [JsonPropertyName("awayTeam")]
    public NhlClubScheduleTeam AwayTeam { get; set; } = new();

    [JsonPropertyName("periodDescriptor")]
    public NhlPeriodDescriptor? PeriodDescriptor { get; set; }
}

public class NhlClubScheduleTeam
{
    [JsonPropertyName("abbrev")]
    public string Abbrev { get; set; } = "";

    [JsonPropertyName("score")]
    public int? Score { get; set; }
}

#endregion

#region NHL Boxscore Response Models

public class NhlBoxscore
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("gameState")]
    public string GameState { get; set; } = "";

    [JsonPropertyName("awayTeam")]
    public NhlBoxscoreTeam AwayTeam { get; set; } = new();

    [JsonPropertyName("homeTeam")]
    public NhlBoxscoreTeam HomeTeam { get; set; } = new();

    [JsonPropertyName("playerByGameStats")]
    public NhlPlayerByGameStats? PlayerByGameStats { get; set; }
}

public class NhlBoxscoreTeam
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("abbrev")]
    public string Abbrev { get; set; } = "";

    [JsonPropertyName("score")]
    public int Score { get; set; }

    [JsonPropertyName("sog")]
    public int ShotsOnGoal { get; set; }
}

public class NhlPlayerByGameStats
{
    [JsonPropertyName("awayTeam")]
    public NhlTeamPlayerStats AwayTeam { get; set; } = new();

    [JsonPropertyName("homeTeam")]
    public NhlTeamPlayerStats HomeTeam { get; set; } = new();
}

public class NhlTeamPlayerStats
{
    [JsonPropertyName("forwards")]
    public List<NhlSkaterStats> Forwards { get; set; } = [];

    [JsonPropertyName("defense")]
    public List<NhlSkaterStats> Defense { get; set; } = [];

    [JsonPropertyName("goalies")]
    public List<NhlGoalieStats> Goalies { get; set; } = [];
}

public class NhlSkaterStats
{
    [JsonPropertyName("playerId")]
    public int PlayerId { get; set; }

    [JsonPropertyName("sweaterNumber")]
    public int SweaterNumber { get; set; }

    [JsonPropertyName("name")]
    public NhlPlayerName Name { get; set; } = new();

    [JsonPropertyName("position")]
    public string Position { get; set; } = "";

    [JsonPropertyName("goals")]
    public int Goals { get; set; }

    [JsonPropertyName("assists")]
    public int Assists { get; set; }

    [JsonPropertyName("points")]
    public int Points { get; set; }

    [JsonPropertyName("plusMinus")]
    public int PlusMinus { get; set; }

    [JsonPropertyName("pim")]
    public int PenaltyMinutes { get; set; }

    [JsonPropertyName("hits")]
    public int Hits { get; set; }

    [JsonPropertyName("powerPlayGoals")]
    public int PowerPlayGoals { get; set; }

    [JsonPropertyName("sog")]
    public int ShotsOnGoal { get; set; }

    [JsonPropertyName("faceoffWinningPctg")]
    public decimal FaceoffWinningPct { get; set; }

    [JsonPropertyName("toi")]
    public string TimeOnIce { get; set; } = "";

    [JsonPropertyName("blockedShots")]
    public int BlockedShots { get; set; }

    [JsonPropertyName("shifts")]
    public int Shifts { get; set; }

    [JsonPropertyName("giveaways")]
    public int Giveaways { get; set; }

    [JsonPropertyName("takeaways")]
    public int Takeaways { get; set; }
}

public class NhlGoalieStats
{
    [JsonPropertyName("playerId")]
    public int PlayerId { get; set; }

    [JsonPropertyName("sweaterNumber")]
    public int SweaterNumber { get; set; }

    [JsonPropertyName("name")]
    public NhlPlayerName Name { get; set; } = new();

    [JsonPropertyName("position")]
    public string Position { get; set; } = "";

    [JsonPropertyName("evenStrengthShotsAgainst")]
    public string EvenStrengthShotsAgainst { get; set; } = "";

    [JsonPropertyName("powerPlayShotsAgainst")]
    public string PowerPlayShotsAgainst { get; set; } = "";

    [JsonPropertyName("shorthandedShotsAgainst")]
    public string ShorthandedShotsAgainst { get; set; } = "";

    [JsonPropertyName("saveShotsAgainst")]
    public string SaveShotsAgainst { get; set; } = "";

    [JsonPropertyName("savePctg")]
    public decimal? SavePct { get; set; }

    [JsonPropertyName("goalsAgainst")]
    public int GoalsAgainst { get; set; }

    [JsonPropertyName("toi")]
    public string TimeOnIce { get; set; } = "";

    [JsonPropertyName("starter")]
    public bool Starter { get; set; }

    [JsonPropertyName("decision")]
    public string? Decision { get; set; }

    [JsonPropertyName("shotsAgainst")]
    public int ShotsAgainst { get; set; }

    [JsonPropertyName("saves")]
    public int Saves { get; set; }

    [JsonPropertyName("pim")]
    public int PenaltyMinutes { get; set; }
}

public class NhlPlayerName
{
    [JsonPropertyName("default")]
    public string Default { get; set; } = "";
}

#endregion

#region NHL Live Scores Response Models

public class NhlLiveScoresResponse
{
    [JsonPropertyName("currentDate")]
    public string CurrentDate { get; set; } = "";

    [JsonPropertyName("games")]
    public List<NhlLiveGame> Games { get; set; } = [];
}

public class NhlLiveGame
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("season")]
    public int Season { get; set; }

    [JsonPropertyName("gameType")]
    public int GameType { get; set; }

    [JsonPropertyName("gameDate")]
    public string GameDate { get; set; } = "";

    [JsonPropertyName("startTimeUTC")]
    public string? StartTimeUtc { get; set; }

    [JsonPropertyName("gameState")]
    public string GameState { get; set; } = "";

    [JsonPropertyName("gameScheduleState")]
    public string GameScheduleState { get; set; } = "";

    [JsonPropertyName("period")]
    public int? Period { get; set; }

    [JsonPropertyName("periodDescriptor")]
    public NhlLivePeriodDescriptor? PeriodDescriptor { get; set; }

    [JsonPropertyName("clock")]
    public NhlGameClock? Clock { get; set; }

    [JsonPropertyName("awayTeam")]
    public NhlLiveTeam AwayTeam { get; set; } = new();

    [JsonPropertyName("homeTeam")]
    public NhlLiveTeam HomeTeam { get; set; } = new();

    [JsonPropertyName("goals")]
    public List<NhlGameGoal> Goals { get; set; } = [];
}

public class NhlLivePeriodDescriptor
{
    [JsonPropertyName("number")]
    public int? Number { get; set; }

    [JsonPropertyName("periodType")]
    public string? PeriodType { get; set; }
}

public class NhlGameClock
{
    [JsonPropertyName("timeRemaining")]
    public string? TimeRemaining { get; set; }

    [JsonPropertyName("secondsRemaining")]
    public int? SecondsRemaining { get; set; }

    [JsonPropertyName("running")]
    public bool Running { get; set; }

    [JsonPropertyName("inIntermission")]
    public bool InIntermission { get; set; }
}

public class NhlLiveTeam
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public NhlTeamName? Name { get; set; }

    [JsonPropertyName("abbrev")]
    public string Abbrev { get; set; } = "";

    [JsonPropertyName("score")]
    public int? Score { get; set; }

    [JsonPropertyName("sog")]
    public int? ShotsOnGoal { get; set; }

    [JsonPropertyName("record")]
    public string? Record { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }
}

public class NhlTeamName
{
    [JsonPropertyName("default")]
    public string Default { get; set; } = "";
}

public class NhlGameGoal
{
    [JsonPropertyName("period")]
    public int Period { get; set; }

    [JsonPropertyName("timeInPeriod")]
    public string TimeInPeriod { get; set; } = "";

    [JsonPropertyName("playerId")]
    public int PlayerId { get; set; }

    [JsonPropertyName("name")]
    public NhlPlayerName? Name { get; set; }

    [JsonPropertyName("firstName")]
    public NhlPlayerName? FirstName { get; set; }

    [JsonPropertyName("lastName")]
    public NhlPlayerName? LastName { get; set; }

    [JsonPropertyName("goalModifier")]
    public string? GoalModifier { get; set; }

    [JsonPropertyName("assists")]
    public List<NhlGoalAssist> Assists { get; set; } = [];

    [JsonPropertyName("awayScore")]
    public int AwayScore { get; set; }

    [JsonPropertyName("homeScore")]
    public int HomeScore { get; set; }

    [JsonPropertyName("teamAbbrev")]
    public string? TeamAbbrev { get; set; }

    [JsonPropertyName("strength")]
    public string? Strength { get; set; }
}

public class NhlGoalAssist
{
    [JsonPropertyName("playerId")]
    public int PlayerId { get; set; }

    [JsonPropertyName("name")]
    public NhlPlayerName? Name { get; set; }

    [JsonPropertyName("assistsToDate")]
    public int? AssistsToDate { get; set; }
}

#endregion

#region Game Landing Models

public class NhlGameLanding
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("gameState")]
    public string GameState { get; set; } = "";

    [JsonPropertyName("gameDate")]
    public string GameDate { get; set; } = "";

    [JsonPropertyName("awayTeam")]
    public NhlLandingTeam AwayTeam { get; set; } = new();

    [JsonPropertyName("homeTeam")]
    public NhlLandingTeam HomeTeam { get; set; } = new();

    [JsonPropertyName("summary")]
    public NhlGameSummary? Summary { get; set; }
}

public class NhlLandingTeam
{
    [JsonPropertyName("abbrev")]
    public string Abbrev { get; set; } = "";

    [JsonPropertyName("score")]
    public int? Score { get; set; }
}

public class NhlGameSummary
{
    [JsonPropertyName("scoring")]
    public List<NhlPeriodScoring> Scoring { get; set; } = [];
}

public class NhlPeriodScoring
{
    [JsonPropertyName("periodDescriptor")]
    public NhlPeriodDescriptor? PeriodDescriptor { get; set; }

    [JsonPropertyName("goals")]
    public List<NhlScoringGoal> Goals { get; set; } = [];
}

public class NhlScoringGoal
{
    [JsonPropertyName("period")]
    public int Period { get; set; }

    [JsonPropertyName("timeInPeriod")]
    public string TimeInPeriod { get; set; } = "";

    [JsonPropertyName("playerId")]
    public int PlayerId { get; set; }

    [JsonPropertyName("name")]
    public NhlPlayerName? Name { get; set; }

    [JsonPropertyName("firstName")]
    public NhlPlayerName? FirstName { get; set; }

    [JsonPropertyName("lastName")]
    public NhlPlayerName? LastName { get; set; }

    [JsonPropertyName("teamAbbrev")]
    public NhlPlayerName? TeamAbbrev { get; set; }

    [JsonPropertyName("goalsToDate")]
    public int? GoalsToDate { get; set; }

    [JsonPropertyName("awayScore")]
    public int AwayScore { get; set; }

    [JsonPropertyName("homeScore")]
    public int HomeScore { get; set; }

    [JsonPropertyName("strength")]
    public string? Strength { get; set; }

    [JsonPropertyName("assists")]
    public List<NhlGoalAssist> Assists { get; set; } = [];
}

#endregion

#region NHL Standings Models

public class NhlStandingsResponse
{
    [JsonPropertyName("standings")]
    public List<NhlTeamStandings> Standings { get; set; } = [];
}

public class NhlTeamStandings
{
    [JsonPropertyName("teamAbbrev")]
    public NhlLocalizedString? TeamAbbrev { get; set; }

    [JsonPropertyName("teamName")]
    public NhlLocalizedString? TeamName { get; set; }

    [JsonPropertyName("gamesPlayed")]
    public int GamesPlayed { get; set; }

    [JsonPropertyName("wins")]
    public int Wins { get; set; }

    [JsonPropertyName("losses")]
    public int Losses { get; set; }

    [JsonPropertyName("otLosses")]
    public int OtLosses { get; set; }

    [JsonPropertyName("points")]
    public int Points { get; set; }

    [JsonPropertyName("pointPctg")]
    public decimal? PointPctg { get; set; }

    [JsonPropertyName("goalFor")]
    public int GoalFor { get; set; }

    [JsonPropertyName("goalAgainst")]
    public int GoalAgainst { get; set; }

    [JsonPropertyName("goalDifferential")]
    public int GoalDifferential { get; set; }

    // Streak
    [JsonPropertyName("streakCode")]
    public string? StreakCode { get; set; }

    [JsonPropertyName("streakCount")]
    public int StreakCount { get; set; }

    // Home record
    [JsonPropertyName("homeWins")]
    public int HomeWins { get; set; }

    [JsonPropertyName("homeLosses")]
    public int HomeLosses { get; set; }

    [JsonPropertyName("homeOtLosses")]
    public int HomeOtLosses { get; set; }

    [JsonPropertyName("homeGamesPlayed")]
    public int HomeGamesPlayed { get; set; }

    // Road record
    [JsonPropertyName("roadWins")]
    public int RoadWins { get; set; }

    [JsonPropertyName("roadLosses")]
    public int RoadLosses { get; set; }

    [JsonPropertyName("roadOtLosses")]
    public int RoadOtLosses { get; set; }

    [JsonPropertyName("roadGamesPlayed")]
    public int RoadGamesPlayed { get; set; }

    // Last 10 games
    [JsonPropertyName("l10Wins")]
    public int L10Wins { get; set; }

    [JsonPropertyName("l10Losses")]
    public int L10Losses { get; set; }

    [JsonPropertyName("l10OtLosses")]
    public int L10OtLosses { get; set; }

    // Division/Conference
    [JsonPropertyName("divisionName")]
    public string? DivisionName { get; set; }

    [JsonPropertyName("divisionSequence")]
    public int DivisionSequence { get; set; }

    [JsonPropertyName("conferenceName")]
    public string? ConferenceName { get; set; }

    [JsonPropertyName("conferenceSequence")]
    public int ConferenceSequence { get; set; }

    [JsonPropertyName("leagueSequence")]
    public int LeagueSequence { get; set; }

    [JsonPropertyName("wildcardSequence")]
    public int WildcardSequence { get; set; }
}

public class NhlLocalizedString
{
    [JsonPropertyName("default")]
    public string? Default { get; set; }
}

#endregion

#region NHL Team Stats Models

public class NhlTeamStatsResponse
{
    [JsonPropertyName("data")]
    public List<NhlTeamStatsData> Data { get; set; } = [];
}

public class NhlTeamStatsData
{
    [JsonPropertyName("teamFullName")]
    public string? TeamFullName { get; set; }

    [JsonPropertyName("powerPlayPct")]
    public decimal? PowerPlayPct { get; set; }

    [JsonPropertyName("penaltyKillPct")]
    public decimal? PenaltyKillPct { get; set; }

    [JsonPropertyName("faceoffWinPct")]
    public decimal? FaceoffWinPct { get; set; }
}

public class NhlTeamSpecialTeams
{
    public decimal? PowerPlayPct { get; set; }
    public decimal? PenaltyKillPct { get; set; }
    public decimal? FaceoffWinPct { get; set; }
}

#endregion
