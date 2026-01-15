using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Services;

public class IngestionService
{
    private readonly MoneyPuckDownloader _downloader;
    private readonly ILogger<IngestionService> _logger;

    public IngestionService(
        MoneyPuckDownloader downloader,
        ILogger<IngestionService> logger)
    {
        _downloader = downloader;
        _logger = logger;
    }

    public async Task<IngestionResult> RunIngestionAsync(string dataset, int? season)
    {
        var startedAt = DateTime.UtcNow;
        _logger.LogInformation("Starting ingestion for {Dataset}, season {Season}", dataset, season);

        try
        {
            var result = dataset.ToLowerInvariant() switch
            {
                "skaters" => await _downloader.DownloadSkatersAsync(season ?? GetCurrentSeason()),
                "lines" => await _downloader.DownloadLinesAsync(season ?? GetCurrentSeason()),
                "teams" => await _downloader.DownloadTeamsAsync(season ?? GetCurrentSeason()),
                "player_bios" => await _downloader.DownloadPlayerBiosAsync(),
                _ => throw new ArgumentException($"Unknown dataset: {dataset}")
            };

            var duration = (DateTime.UtcNow - startedAt).TotalSeconds;
            var status = result.Success ? "completed" : "failed";

            _logger.LogInformation(
                "Ingestion {Status} for {Dataset}: {RecordCount} records in {Duration:F2}s",
                status,
                dataset,
                result.RecordCount,
                duration);

            return new IngestionResult
            {
                Success = result.Success,
                Dataset = dataset,
                Season = season,
                RecordsProcessed = result.RecordCount,
                Message = result.Success
                    ? $"Successfully downloaded {result.RecordCount} records"
                    : $"Failed: {result.ErrorMessage}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ingestion failed for {Dataset}", dataset);

            return new IngestionResult
            {
                Success = false,
                Dataset = dataset,
                Season = season,
                RecordsProcessed = 0,
                Message = $"Exception: {ex.Message}"
            };
        }
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        // NHL season starts in October, so if we're before October, use previous year
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}

public class IngestionResult
{
    public bool Success { get; init; }
    public required string Dataset { get; init; }
    public int? Season { get; init; }
    public int RecordsProcessed { get; init; }
    public required string Message { get; init; }
}
