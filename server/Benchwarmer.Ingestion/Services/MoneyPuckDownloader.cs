using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class MoneyPuckDownloader(HttpClient httpClient, ILogger<MoneyPuckDownloader> logger)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly ILogger<MoneyPuckDownloader> _logger = logger;

    private const string BaseUrl = "https://moneypuck.com/moneypuck/playerData";

    public async Task<DownloadResult> DownloadSkatersAsync(int season, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/seasonSummary/{season}/regular/skaters.csv";
        return await DownloadFileAsync("skaters", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadLinesAsync(int season, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/seasonSummary/{season}/regular/lines.csv";
        return await DownloadFileAsync("lines", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadTeamsAsync(int season, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/seasonSummary/{season}/regular/teams.csv";
        return await DownloadFileAsync("teams", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadPlayerBiosAsync(CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/playerBios/allPlayersLookup.csv";
        return await DownloadFileAsync("player_bios", null, url, cancellationToken);
    }

    private async Task<DownloadResult> DownloadFileAsync(string dataset, int? season, string url, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting download for {Dataset} (season: {Season}) from {Url}", dataset, season, url);

        try
        {
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Download failed for {Dataset}: HTTP {StatusCode}", dataset, response.StatusCode);
                return new DownloadResult
                {
                    Success = false,
                    Dataset = dataset,
                    Season = season,
                    ErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                };
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var lineCount = content.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length - 1; // Subtract header

            _logger.LogInformation("Downloaded {Dataset}: {LineCount} records", dataset, lineCount);

            return new DownloadResult
            {
                Success = true,
                Dataset = dataset,
                Season = season,
                Content = content,
                RecordCount = lineCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception downloading {Dataset}", dataset);
            return new DownloadResult
            {
                Success = false,
                Dataset = dataset,
                Season = season,
                ErrorMessage = ex.Message
            };
        }
    }
}

public class DownloadResult
{
    public bool Success { get; init; }
    public required string Dataset { get; init; }
    public int? Season { get; init; }
    public string? Content { get; init; }
    public int RecordCount { get; init; }
    public string? ErrorMessage { get; init; }
}
