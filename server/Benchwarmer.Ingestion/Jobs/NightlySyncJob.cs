using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Parsers;
using Benchwarmer.Ingestion.Services;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

[DisableConcurrentExecution(timeoutInSeconds: 0)]
[AutomaticRetry(Attempts = 0)]
public class NightlySyncJob(
    MoneyPuckDownloader downloader,
    LineImporter lineImporter,
    SkaterImporter skaterImporter,
    TeamImporter teamImporter,
    ShotImporter shotImporter,
    ILineRepository lineRepository,
    ILogger<NightlySyncJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly SkaterImporter _skaterImporter = skaterImporter;
    private readonly LineImporter _lineImporter = lineImporter;
    private readonly TeamImporter _teamImporter = teamImporter;
    private readonly ShotImporter _shotImporter = shotImporter;
    private readonly ILineRepository _lineRepository = lineRepository;
    private readonly ILogger<NightlySyncJob> _logger = logger;

    private static readonly string[] Datasets = ["teams", "skaters", "lines", "shots"];

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
                "shots" => await _downloader.DownloadShotsAsync(season, cancellationToken),
                _ => throw new ArgumentException($"Unknown dataset: {dataset}")
            };

            if (result.Success && result.Content != null)
            {
                var importedCount = await ImportDatasetAsync(dataset, result.Content, cancellationToken);
                totalRecords += importedCount;
                _logger.LogInformation("{Dataset}: imported {Count} records", dataset, importedCount);
            }
            else if (!result.Success)
            {
                _logger.LogWarning("{Dataset}: failed - {Error}", dataset, result.ErrorMessage);
            }
        }

        // Refresh materialized views after import
        _logger.LogInformation("Refreshing materialized views...");
        await _lineRepository.RefreshChemistryPairsAsync(cancellationToken);

        var duration = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Nightly sync completed: {TotalRecords} records in {Duration:F1}s",
            totalRecords,
            duration.TotalSeconds);
    }

    private async Task<int> ImportDatasetAsync(string dataset, string content, CancellationToken cancellationToken = default)
    {
        return dataset switch
        {
            "skaters" => await ImportSkatersAsync(content),
            "lines" => await ImportLinesAsync(content),
            "teams" => await ImportTeamAsync(content),
            "shots" => await ImportShotsAsync(content, cancellationToken),
            _ => 0
        };
    }

    private async Task<int> ImportSkatersAsync(string csvContent)
    {
        var records = CsvParser.Parse<SkaterRecord>(csvContent);
        return await _skaterImporter.ImportAsync(records);
    }

    private async Task<int> ImportLinesAsync(string csvContent)
    {
        var records = CsvParser.Parse<LineRecord>(csvContent);
        return await _lineImporter.ImportAsync(records);
    }

    private async Task<int> ImportTeamAsync(string csvContent)
    {
        var records = CsvParser.Parse<TeamRecord>(csvContent);
        return await _teamImporter.ImportAsync(records);
    }

    private async Task<int> ImportShotsAsync(string csvContent, CancellationToken cancellationToken)
    {
        var records = CsvParser.Parse<ShotRecord>(csvContent);
        return await _shotImporter.ImportAsync(records, cancellationToken);
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
