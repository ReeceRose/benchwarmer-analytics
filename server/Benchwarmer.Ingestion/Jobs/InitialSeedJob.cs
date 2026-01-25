using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Parsers;
using Benchwarmer.Ingestion.Services;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

// Prevent concurrent execution and disable auto-retry (job handles failures internally)
[DisableConcurrentExecution(timeoutInSeconds: 0)]
[AutomaticRetry(Attempts = 0)]
public class InitialSeedJob(
    MoneyPuckDownloader downloader,
    LineImporter lineImporter,
    SkaterImporter skaterImporter,
    GoalieImporter goalieImporter,
    PlayerBioImporter playerBioImporter,
    TeamImporter teamImporter,
    ShotImporter shotImporter,
    ILineRepository lineRepository,
    ISkaterStatsRepository skaterStatsRepository,
    ILogger<InitialSeedJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly LineImporter _lineImporter = lineImporter;
    private readonly SkaterImporter _skaterImporter = skaterImporter;
    private readonly GoalieImporter _goalieImporter = goalieImporter;
    private readonly PlayerBioImporter _playerBioImporter = playerBioImporter;
    private readonly TeamImporter _teamImporter = teamImporter;
    private readonly ShotImporter _shotImporter = shotImporter;
    private readonly ILineRepository _lineRepository = lineRepository;
    private readonly ISkaterStatsRepository _skaterStatsRepository = skaterStatsRepository;
    private readonly ILogger<InitialSeedJob> _logger = logger;

    // MoneyPuck data starts from 2008
    private const int FirstSeason = 2008;

    // Datasets that have separate regular/playoff data
    private static readonly string[] SeasonTypeDatasets = ["teams", "skaters", "goalies", "lines"];

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

            // Import regular season and playoff data for each dataset
            foreach (var dataset in SeasonTypeDatasets)
            {
                totalRecords += await DownloadAndImportAsync(dataset, season, playoffs: false, cancellationToken);
                totalRecords += await DownloadAndImportAsync(dataset, season, playoffs: true, cancellationToken);
            }

            // Shots don't have separate playoff files
            totalRecords += await DownloadAndImportShotsAsync(season, cancellationToken);
        }

        // Refresh materialized views after import
        _logger.LogInformation("Refreshing materialized views...");
        await _lineRepository.RefreshChemistryPairsAsync(cancellationToken);
        await _skaterStatsRepository.RefreshSeasonPercentilesAsync(cancellationToken);

        var duration = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Initial seed completed: {TotalRecords} total records in {Duration:F1} minutes",
            totalRecords,
            duration.TotalMinutes);
    }

    private async Task<int> DownloadAndImportAsync(string dataset, int season, bool playoffs, CancellationToken cancellationToken)
    {
        var seasonType = playoffs ? "playoffs" : "regular";
        var result = dataset switch
        {
            "teams" => await _downloader.DownloadTeamsAsync(season, playoffs, cancellationToken),
            "skaters" => await _downloader.DownloadSkatersAsync(season, playoffs, cancellationToken),
            "goalies" => await _downloader.DownloadGoaliesAsync(season, playoffs, cancellationToken),
            "lines" => await _downloader.DownloadLinesAsync(season, playoffs, cancellationToken),
            _ => throw new ArgumentException($"Unknown dataset: {dataset}")
        };

        if (result.Success && result.Content != null)
        {
            var importedCount = await ImportDatasetAsync(dataset, result.Content, playoffs);
            _logger.LogInformation("  {Dataset} {Season} {SeasonType}: imported {Count} records", dataset, season, seasonType, importedCount);
            return importedCount;
        }

        if (!result.Success)
        {
            // Playoff data might not exist for incomplete/future seasons - log as debug
            if (playoffs)
            {
                _logger.LogDebug("  {Dataset} {Season} {SeasonType}: no data available", dataset, season, seasonType);
            }
            else
            {
                _logger.LogWarning("  {Dataset} {Season} {SeasonType}: failed - {Error}", dataset, season, seasonType, result.ErrorMessage);
            }
        }

        return 0;
    }

    private async Task<int> DownloadAndImportShotsAsync(int season, CancellationToken cancellationToken)
    {
        var result = await _downloader.DownloadShotsAsync(season, cancellationToken);

        if (result.Success && result.Content != null)
        {
            var records = CsvParser.Parse<ShotRecord>(result.Content);
            var importedCount = await _shotImporter.ImportAsync(records, cancellationToken);
            _logger.LogInformation("  shots {Season}: imported {Count} records", season, importedCount);
            return importedCount;
        }

        if (!result.Success)
        {
            _logger.LogWarning("  shots {Season}: failed - {Error}", season, result.ErrorMessage);
        }

        return 0;
    }

    private async Task<int> ImportDatasetAsync(string dataset, string content, bool playoffs)
    {
        return dataset switch
        {
            "skaters" => await ImportSkatersAsync(content, playoffs),
            "goalies" => await ImportGoaliesAsync(content, playoffs),
            "lines" => await ImportLinesAsync(content),
            "teams" => await ImportTeamAsync(content, playoffs),
            _ => 0
        };
    }

    private async Task<int> ImportSkatersAsync(string csvContent, bool isPlayoffs)
    {
        var records = CsvParser.Parse<SkaterRecord>(csvContent);
        return await _skaterImporter.ImportAsync(records, isPlayoffs);
    }

    private async Task<int> ImportGoaliesAsync(string csvContent, bool isPlayoffs)
    {
        var records = CsvParser.Parse<GoalieRecord>(csvContent);
        return await _goalieImporter.ImportAsync(records, isPlayoffs);
    }

    private async Task<int> ImportLinesAsync(string csvContent)
    {
        var records = CsvParser.Parse<LineRecord>(csvContent);
        return await _lineImporter.ImportAsync(records);
    }

    private async Task<int> ImportTeamAsync(string csvContent, bool isPlayoffs)
    {
        var records = CsvParser.Parse<TeamRecord>(csvContent);
        return await _teamImporter.ImportAsync(records, isPlayoffs);
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
