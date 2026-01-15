using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Parsers;
using Benchwarmer.Ingestion.Services;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

public class InitialSeedJob(
    MoneyPuckDownloader downloader,
    LineImporter lineImporter,
    SkaterImporter skaterImporter,
    PlayerBioImporter playerBioImporter,
    TeamImporter teamImporter,
    ILogger<InitialSeedJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly LineImporter _lineImporter = lineImporter;
    private readonly SkaterImporter _skaterImporter = skaterImporter;
    private readonly PlayerBioImporter _playerBioImporter = playerBioImporter;
    private readonly TeamImporter _teamImporter = teamImporter;
    private readonly ILogger<InitialSeedJob> _logger = logger;

    // MoneyPuck data starts from 2008
    private const int FirstSeason = 2008;

    private static readonly string[] Datasets = ["teams", "skaters", "lines"];

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        var currentSeason = GetCurrentSeason();
        _logger.LogInformation("Starting initial seed from {FirstSeason} to {CurrentSeason}", FirstSeason, currentSeason);

        var totalRecords = 0;
        var startTime = DateTime.UtcNow;

        // Download player bios first (not season-specific)
        _logger.LogInformation("Downloading player bios...");
        var biosResult = await _downloader.DownloadPlayerBiosAsync(cancellationToken);
        if (biosResult.Success && biosResult.Content != null)
        {
            var bios = CsvParser.Parse<PlayerBioRecord>(biosResult.Content);
            var count = await _playerBioImporter.ImportAsync(bios);
            totalRecords += count;
            _logger.LogInformation("Player bios: imported {Count} records", count);
        }
        else if (!biosResult.Success)
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

        if (result.Success && result.Content != null)
        {
            var importedCount = await ImportDatasetAsync(dataset, result.Content);
            _logger.LogInformation("  {Dataset} {Season}: imported {Count} records", dataset, season, importedCount);
        }
        else if (!result.Success)
        {
            _logger.LogWarning("  {Dataset} {Season}: failed - {Error}", dataset, season, result.ErrorMessage);
        }

        return result;
    }

    private async Task<int> ImportDatasetAsync(string dataset, string content)
    {
        return dataset switch
        {
            "skaters" => await ImportSkatersAsync(content),
            "lines" => await ImportLinesAsync(content),
            "teams" => await ImportTeamAsync(content),
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

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
