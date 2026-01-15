using Benchwarmer.Ingestion.Services;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

public class NightlySyncJob
{
    private readonly MoneyPuckDownloader _downloader;
    private readonly ILogger<NightlySyncJob> _logger;

    private static readonly string[] Datasets = ["teams", "skaters", "lines"];

    public NightlySyncJob(MoneyPuckDownloader downloader, ILogger<NightlySyncJob> logger)
    {
        _downloader = downloader;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        var season = GetCurrentSeason();
        _logger.LogInformation("Starting nightly sync for season {Season}", season);

        var totalRecords = 0;
        var startTime = DateTime.UtcNow;

        foreach (var dataset in Datasets)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("Nightly sync cancelled");
                break;
            }

            var result = dataset switch
            {
                "teams" => await _downloader.DownloadTeamsAsync(season, cancellationToken),
                "skaters" => await _downloader.DownloadSkatersAsync(season, cancellationToken),
                "lines" => await _downloader.DownloadLinesAsync(season, cancellationToken),
                _ => throw new ArgumentException($"Unknown dataset: {dataset}")
            };

            if (result.Success)
            {
                totalRecords += result.RecordCount;
                _logger.LogInformation("{Dataset}: {Count} records", dataset, result.RecordCount);
            }
            else
            {
                _logger.LogWarning("{Dataset}: failed - {Error}", dataset, result.ErrorMessage);
            }
        }

        var duration = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Nightly sync completed: {TotalRecords} records in {Duration:F1}s",
            totalRecords,
            duration.TotalSeconds);
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
