using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Parsers;
using Benchwarmer.Ingestion.Services;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Jobs;

public class WeeklyBioSyncJob(
    MoneyPuckDownloader downloader,
    PlayerBioImporter playerBioImporter,
    ILogger<WeeklyBioSyncJob> logger)
{
    private readonly MoneyPuckDownloader _downloader = downloader;
    private readonly PlayerBioImporter _playerBioImporter = playerBioImporter;
    private readonly ILogger<WeeklyBioSyncJob> _logger = logger;

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting weekly player bio sync");
        var startTime = DateTime.UtcNow;

        var result = await _downloader.DownloadPlayerBiosAsync(cancellationToken);

        if (result.Success && result.Content != null)
        {
            var bios = PlayerBioCsvParser.Parse(result.Content);
            var count = await _playerBioImporter.ImportAsync(bios);

            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Weekly bio sync completed: {Count} players updated in {Duration:F1}s",
                count,
                duration.TotalSeconds);
        }
        else
        {
            _logger.LogWarning("Failed to download player bios: {Error}", result.ErrorMessage);
        }
    }
}
