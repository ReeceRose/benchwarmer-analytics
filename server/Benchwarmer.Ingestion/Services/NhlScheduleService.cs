using System.Text.Json;
using System.Text.Json.Serialization;
using Benchwarmer.Data.Entities;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class NhlScheduleService(HttpClient httpClient, ILogger<NhlScheduleService> logger)
{
    private const string BaseUrl = "https://api-web.nhle.com/v1";

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
