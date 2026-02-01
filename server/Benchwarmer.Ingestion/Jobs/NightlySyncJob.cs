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
    NhlScheduleService nhlScheduleService,
    LineImporter lineImporter,
    SkaterImporter skaterImporter,
    GoalieImporter goalieImporter,
    TeamImporter teamImporter,
    ShotImporter shotImporter,
    ScoreStateTimeCalculator scoreStateTimeCalculator,
    ILineRepository lineRepository,
    IGameRepository gameRepository,
    ISkaterStatsRepository skaterStatsRepository,
    ILogger<NightlySyncJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly NhlScheduleService _nhlScheduleService = nhlScheduleService;
    private readonly SkaterImporter _skaterImporter = skaterImporter;
    private readonly GoalieImporter _goalieImporter = goalieImporter;
    private readonly LineImporter _lineImporter = lineImporter;
    private readonly TeamImporter _teamImporter = teamImporter;
    private readonly ShotImporter _shotImporter = shotImporter;
    private readonly ScoreStateTimeCalculator _scoreStateTimeCalculator = scoreStateTimeCalculator;
    private readonly ILineRepository _lineRepository = lineRepository;
    private readonly IGameRepository _gameRepository = gameRepository;
    private readonly ISkaterStatsRepository _skaterStatsRepository = skaterStatsRepository;
    private readonly ILogger<NightlySyncJob> _logger = logger;

    // Datasets that have separate regular/playoff data
    private static readonly string[] SeasonTypeDatasets = ["teams", "skaters", "goalies", "lines"];

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        var season = GetCurrentSeason();
        _logger.LogInformation("Starting nightly sync for season {Season}", season);

        var totalRecords = 0;
        var startTime = DateTime.UtcNow;

        if (cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Nightly sync cancelled");
            return;
        }

        // Sync game schedule from NHL API (yesterday and today)
        await SyncGameScheduleAsync(cancellationToken);

        // Sync regular season and playoff data for each dataset
        foreach (var dataset in SeasonTypeDatasets)
        {
            totalRecords += await DownloadAndImportAsync(dataset, season, playoffs: false, cancellationToken);
            totalRecords += await DownloadAndImportAsync(dataset, season, playoffs: true, cancellationToken);
        }

        // Shots don't have separate playoff files
        totalRecords += await DownloadAndImportShotsAsync(season, cancellationToken);

        // Calculate score state times after shots are imported
        _logger.LogInformation("Calculating score state times...");
        await _scoreStateTimeCalculator.CalculateForSeasonAsync(season, cancellationToken);

        // Refresh materialized views after import
        _logger.LogInformation("Refreshing materialized views...");
        await _lineRepository.RefreshChemistryPairsAsync(cancellationToken);
        await _skaterStatsRepository.RefreshSeasonPercentilesAsync(cancellationToken);

        var duration = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Nightly sync completed: {TotalRecords} records in {Duration:F1}s",
            totalRecords,
            duration.TotalSeconds);
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
            _logger.LogInformation("{Dataset} {SeasonType}: imported {Count} records", dataset, seasonType, importedCount);
            return importedCount;
        }

        if (!result.Success)
        {
            // Playoff data might not exist during regular season - log as debug
            if (playoffs)
            {
                _logger.LogDebug("{Dataset} {SeasonType}: no data available", dataset, seasonType);
            }
            else
            {
                _logger.LogWarning("{Dataset} {SeasonType}: failed - {Error}", dataset, seasonType, result.ErrorMessage);
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
            _logger.LogInformation("shots: imported {Count} records", importedCount);
            return importedCount;
        }

        if (!result.Success)
        {
            _logger.LogWarning("shots: failed - {Error}", result.ErrorMessage);
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
            "teams" => await ImportTeamAsync(content),
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

    private async Task<int> ImportTeamAsync(string csvContent)
    {
        var records = CsvParser.Parse<TeamRecord>(csvContent);
        return await _teamImporter.ImportAsync(records);
    }

    private async Task SyncGameScheduleAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Syncing NHL game schedule...");

        // Use ET timezone (NHL is ET-centric)
        var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, etZone);
        var today = DateOnly.FromDateTime(nowEt);
        var yesterday = today.AddDays(-1);

        try
        {
            // Fetch yesterday's and today's games
            var games = await _nhlScheduleService.GetGamesForDateRangeAsync(yesterday, today, cancellationToken);

            if (games.Count > 0)
            {
                await _gameRepository.UpsertBatchAsync(games, cancellationToken);
                _logger.LogInformation("Synced {Count} games from NHL schedule", games.Count);
            }
            else
            {
                _logger.LogInformation("No games found in NHL schedule for {Yesterday} - {Today}", yesterday, today);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync NHL schedule - continuing with other imports");
        }
    }

    private static int GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        return now.Month >= 10 ? now.Year : now.Year - 1;
    }
}
