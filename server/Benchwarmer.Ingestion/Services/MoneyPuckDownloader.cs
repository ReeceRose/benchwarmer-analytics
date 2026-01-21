using System.IO.Compression;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class MoneyPuckDownloader(HttpClient httpClient, ILogger<MoneyPuckDownloader> logger)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly ILogger<MoneyPuckDownloader> _logger = logger;

    private const string BaseUrl = "https://moneypuck.com/moneypuck/playerData";

    private static string GetSeasonType(bool playoffs) => playoffs ? "playoffs" : "regular";

    public async Task<DownloadResult> DownloadSkatersAsync(int season, bool playoffs = false, CancellationToken cancellationToken = default)
    {
        var seasonType = GetSeasonType(playoffs);
        var url = $"{BaseUrl}/seasonSummary/{season}/{seasonType}/skaters.csv";
        return await DownloadFileAsync($"skaters_{seasonType}", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadLinesAsync(int season, bool playoffs = false, CancellationToken cancellationToken = default)
    {
        var seasonType = GetSeasonType(playoffs);
        var url = $"{BaseUrl}/seasonSummary/{season}/{seasonType}/lines.csv";
        return await DownloadFileAsync($"lines_{seasonType}", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadTeamsAsync(int season, bool playoffs = false, CancellationToken cancellationToken = default)
    {
        var seasonType = GetSeasonType(playoffs);
        var url = $"{BaseUrl}/seasonSummary/{season}/{seasonType}/teams.csv";
        return await DownloadFileAsync($"teams_{seasonType}", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadGoaliesAsync(int season, bool playoffs = false, CancellationToken cancellationToken = default)
    {
        var seasonType = GetSeasonType(playoffs);
        var url = $"{BaseUrl}/seasonSummary/{season}/{seasonType}/goalies.csv";
        return await DownloadFileAsync($"goalies_{seasonType}", season, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadPlayerBiosAsync(CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl}/playerBios/allPlayersLookup.csv";
        return await DownloadFileAsync("player_bios", null, url, cancellationToken);
    }

    public async Task<DownloadResult> DownloadShotsAsync(int season, CancellationToken cancellationToken = default)
    {
        var url = $"https://peter-tanner.com/moneypuck/downloads/shots_{season}.zip";
        return await DownloadZipFileAsync("shots", season, url, cancellationToken);
    }

    private async Task<DownloadResult> DownloadZipFileAsync(string dataset, int season, string url, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting ZIP download for {Dataset} (season: {Season}) from {Url}", dataset, season, url);

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

            await using var zipStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

            // Find the CSV file in the archive (typically named shots_YEAR.csv)
            var csvEntry = archive.Entries.FirstOrDefault(e => e.Name.EndsWith(".csv", StringComparison.OrdinalIgnoreCase));
            if (csvEntry == null)
            {
                _logger.LogWarning("No CSV file found in ZIP archive for {Dataset}", dataset);
                return new DownloadResult
                {
                    Success = false,
                    Dataset = dataset,
                    Season = season,
                    ErrorMessage = "No CSV file found in ZIP archive"
                };
            }

            await using var entryStream = csvEntry.Open();
            using var reader = new StreamReader(entryStream);
            var content = await reader.ReadToEndAsync(cancellationToken);

            var lineCount = content.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length - 1;
            _logger.LogInformation("Downloaded {Dataset} {Season}: {LineCount} records from ZIP", dataset, season, lineCount);

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
            _logger.LogError(ex, "Exception downloading ZIP {Dataset}", dataset);
            return new DownloadResult
            {
                Success = false,
                Dataset = dataset,
                Season = season,
                ErrorMessage = ex.Message
            };
        }
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
