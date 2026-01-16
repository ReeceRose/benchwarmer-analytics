using Benchwarmer.Data;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Api.Endpoints;
using Benchwarmer.Api.Filters;
using Benchwarmer.Ingestion.Importers;
using Benchwarmer.Ingestion.Jobs;
using Benchwarmer.Ingestion.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
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

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:5173"];
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(
                builder.Configuration.GetConnectionString("DefaultConnection"))));
    builder.Services.AddHangfireServer();

    // Repositories
    builder.Services.AddScoped<ITeamRepository, TeamRepository>();
    builder.Services.AddScoped<IPlayerRepository, PlayerRepository>();
    builder.Services.AddScoped<ILineRepository, LineRepository>();
    builder.Services.AddScoped<ISkaterStatsRepository, SkaterStatsRepository>();

    // Services
    builder.Services.AddHttpClient<MoneyPuckDownloader>();
    builder.Services.AddScoped<IngestionService>();
    builder.Services.AddScoped<LineImporter>();
    builder.Services.AddScoped<SkaterImporter>();
    builder.Services.AddScoped<PlayerBioImporter>();
    builder.Services.AddScoped<TeamImporter>();
    builder.Services.AddScoped<InitialSeedJob>();
    builder.Services.AddScoped<NightlySyncJob>();
    builder.Services.AddScoped<WeeklyBioSyncJob>();

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseCors();

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

    // Schedule weekly bio sync on Sundays at 5 AM EST (10 AM UTC)
    RecurringJob.AddOrUpdate<WeeklyBioSyncJob>(
        "weekly-bio-sync",
        job => job.RunAsync(CancellationToken.None),
        "0 10 * * 0",
        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

    app.MapTeamEndpoints();
    app.MapPlayerEndpoints();
    app.MapSeasonEndpoints();

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

    app.MapPost("/api/admin/sync-bios", (WeeklyBioSyncJob job) =>
    {
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Bio sync started", jobId };
    })
    .WithName("TriggerBioSync")
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
