using Benchwarmer.Ingestion.Services;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

public class InitialSeedJob
{
    private readonly MoneyPuckDownloader _downloader;
    private readonly ILogger<InitialSeedJob> _logger;

    // MoneyPuck data starts from 2008
    private const int FirstSeason = 2008;

    private static readonly string[] Datasets = ["teams", "skaters", "lines"];

    public InitialSeedJob(MoneyPuckDownloader downloader, ILogger<InitialSeedJob> logger)
    {
        _downloader = downloader;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        var currentSeason = GetCurrentSeason();
        _logger.LogInformation("Starting initial seed from {FirstSeason} to {CurrentSeason}", FirstSeason, currentSeason);

        var totalRecords = 0;
        var startTime = DateTime.UtcNow;

        // Download player bios first (not season-specific)
        _logger.LogInformation("Downloading player bios...");
        var biosResult = await _downloader.DownloadPlayerBiosAsync(cancellationToken);
        if (biosResult.Success)
        {
            totalRecords += biosResult.RecordCount;
            _logger.LogInformation("Player bios: {Count} records", biosResult.RecordCount);
        }
        else
        {
            _logger.LogWarning("Failed to download player bios: {Error}", biosResult.ErrorMessage);
        }

        // Download season data
        for (var season = FirstSeason; season <= currentSeason; season++)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("Seed cancelled at season {Season}", season);
                break;
            }

            _logger.LogInformation("Processing season {Season}...", season);

            foreach (var dataset in Datasets)
            {
                var result = await DownloadDatasetAsync(dataset, season, cancellationToken);
                if (result.Success)
                {
                    totalRecords += result.RecordCount;
                }
            }
        }

        var duration = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Initial seed completed: {TotalRecords} total records in {Duration:F1} minutes",
            totalRecords,
            duration.TotalMinutes);
    }

    private async Task<DownloadResult> DownloadDatasetAsync(string dataset, int season, CancellationToken cancellationToken)
    {
        var result = dataset switch
        {
            "teams" => await _downloader.DownloadTeamsAsync(season, cancellationToken),
            "skaters" => await _downloader.DownloadSkatersAsync(season, cancellationToken),
            "lines" => await _downloader.DownloadLinesAsync(season, cancellationToken),
            _ => throw new ArgumentException($"Unknown dataset: {dataset}")
        };

        if (result.Success)
        {
            _logger.LogInformation("  {Dataset} {Season}: {Count} records", dataset, season, result.RecordCount);
        }
        else
        {
            _logger.LogWarning("  {Dataset} {Season}: failed - {Error}", dataset, season, result.ErrorMessage);
        }

        return result;
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
