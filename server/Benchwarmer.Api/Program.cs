using Benchwarmer.Api.Filters;
using Benchwarmer.Ingestion.Jobs;
using Benchwarmer.Ingestion.Services;
using Hangfire;
using Hangfire.MemoryStorage;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, configuration) =>
        configuration.ReadFrom.Configuration(context.Configuration));

    builder.Services.AddOpenApi();

    // Hangfire with in-memory storage (switch to PostgreSQL when DB is added)
    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UseMemoryStorage());
    builder.Services.AddHangfireServer();

    // Services
    builder.Services.AddHttpClient<MoneyPuckDownloader>();
    builder.Services.AddScoped<IngestionService>();
    builder.Services.AddScoped<InitialSeedJob>();
    builder.Services.AddScoped<NightlySyncJob>();

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    // Hangfire dashboard at /hangfire (secured in non-dev environments)
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = [new HangfireDashboardAuthFilter(builder.Configuration)]
    });

    // Schedule nightly sync at 4 AM EST (9 AM UTC)
    RecurringJob.AddOrUpdate<NightlySyncJob>(
        "nightly-sync",
        job => job.RunAsync(CancellationToken.None),
        "0 9 * * *",
        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

    app.MapGet("/api/health", () => new { status = "healthy" })
        .WithName("HealthCheck");

    app.MapPost("/api/admin/seed", (InitialSeedJob job) =>
    {
        // Run in background so the request doesn't timeout
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Initial seed started", jobId };
    })
    .WithName("TriggerSeed")
    .AddEndpointFilter<ApiKeyFilter>();

    app.MapPost("/api/admin/sync", (NightlySyncJob job) =>
    {
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Nightly sync started", jobId };
    })
    .WithName("TriggerSync")
    .AddEndpointFilter<ApiKeyFilter>();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
