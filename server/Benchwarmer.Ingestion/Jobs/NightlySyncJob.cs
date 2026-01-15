using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Parsers;
using Benchwarmer.Ingestion.Services;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

public class NightlySyncJob(
    MoneyPuckDownloader downloader,
    SkaterImporter skaterImporter,
    ILogger<NightlySyncJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly SkaterImporter _skaterImporter = skaterImporter;
    private readonly ILogger<NightlySyncJob> _logger = logger;

    private static readonly string[] Datasets = ["teams", "skaters", "lines"];

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

            if (result.Success && result.Content != null)
            {
                var importedCount = await ImportDatasetAsync(dataset, result.Content);
                totalRecords += importedCount;
                _logger.LogInformation("{Dataset}: imported {Count} records", dataset, importedCount);
            }
            else if (!result.Success)
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

    private async Task<int> ImportDatasetAsync(string dataset, string content)
    {
        return dataset switch
        {
            "skaters" => await ImportSkatersAsync(content),
            // TODO: Add lines and teams importers
            "lines" => 0,
            "teams" => 0,
            _ => 0
        };
    }

    private async Task<int> ImportSkatersAsync(string csvContent)
    {
        var records = SkaterCsvParser.Parse(csvContent);
        return await _skaterImporter.ImportAsync(records);
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
