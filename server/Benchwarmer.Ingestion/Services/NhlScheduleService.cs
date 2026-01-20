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

    private static int ParseSeason(int seasonCode)
    {
        // Season code is like 20242025, we want 2024
        return seasonCode / 10000;
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

internal class NhlPeriodDescriptor
{
    [JsonPropertyName("periodType")]
    public string? PeriodType { get; set; }
}

#endregion
