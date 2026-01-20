using Benchwarmer.Api;
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
using Microsoft.OpenApi;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, configuration) =>
        configuration.ReadFrom.Configuration(context.Configuration));

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Benchwarmer Analytics API",
            Version = "v1",
            Description = """
                Hockey analytics API for exploring NHL data, line combinations, and player performance.

                **Data Sources:**
                - Player statistics and line combinations from [MoneyPuck.com](https://moneypuck.com)
                - Player biographical data from [NHL.com](https://nhl.com)

                *"Analysis from the cheap seats"*
                """,
            Contact = new OpenApiContact
            {
                Name = "Reece Rose",
                Url = new Uri("https://reecerose.com")
            },
            License = new OpenApiLicense
            {
                Name = "MIT",
                Url = new Uri("https://opensource.org/licenses/MIT")
            }
        });

        options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            In = ParameterLocation.Header,
            Name = "X-Api-Key",
            Description = "API key required for admin endpoints"
        });
    });

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

    builder.Services.AddOutputCache(options =>
    {
        options.AddPolicy(CachePolicies.StaticData, b => b.Expire(TimeSpan.FromHours(24)));
        options.AddPolicy(CachePolicies.SemiStaticData, b => b.Expire(TimeSpan.FromHours(6)));
        options.AddPolicy(CachePolicies.TeamData, b => b
            .Expire(TimeSpan.FromMinutes(30))
            .SetVaryByQuery("season", "situation", "playoffs", "lineType", "minToi", "sortBy", "sortDir", "page", "pageSize", "period", "shotType", "playerId", "goalsOnly", "limit", "position"));
        options.AddPolicy(CachePolicies.SearchResults, b => b
            .Expire(TimeSpan.FromMinutes(5))
            .SetVaryByQuery("q", "page", "pageSize"));
    });

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(
                builder.Configuration.GetConnectionString("DefaultConnection")),
            new PostgreSqlStorageOptions
            {
                // Initial seed can take hours - prevent job re-queue during long-running imports
                InvisibilityTimeout = TimeSpan.FromHours(4)
            }));
    builder.Services.AddHangfireServer();

    // Repositories
    builder.Services.AddScoped<ITeamRepository, TeamRepository>();
    builder.Services.AddScoped<IPlayerRepository, PlayerRepository>();
    builder.Services.AddScoped<ILineRepository, LineRepository>();
    builder.Services.AddScoped<ISkaterStatsRepository, SkaterStatsRepository>();
    builder.Services.AddScoped<IShotRepository, ShotRepository>();
    builder.Services.AddScoped<IStatsRepository, StatsRepository>();
    builder.Services.AddScoped<IGameRepository, GameRepository>();
    builder.Services.AddScoped<IGameStatsRepository, GameStatsRepository>();

    // Services
    builder.Services.AddHttpClient<MoneyPuckDownloader>();
    builder.Services.AddHttpClient<NhlScheduleService>();
    builder.Services.AddScoped<IngestionService>();
    builder.Services.AddScoped<LineImporter>();
    builder.Services.AddScoped<SkaterImporter>();
    builder.Services.AddScoped<PlayerBioImporter>();
    builder.Services.AddScoped<TeamImporter>();
    builder.Services.AddScoped<ShotImporter>();
    builder.Services.AddScoped<InitialSeedJob>();
    builder.Services.AddScoped<NightlySyncJob>();
    builder.Services.AddScoped<WeeklyBioSyncJob>();

    var app = builder.Build();

    // Swagger UI always available in development, optionally in production via config
    if (app.Environment.IsDevelopment() ||
        builder.Configuration.GetValue<bool>("EnableSwagger"))
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Benchwarmer Analytics API v1");
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "Benchwarmer Analytics API";
        });
    }

    app.UseCors();
    app.UseOutputCache();

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
    app.MapStatsEndpoints();
    app.MapShotEndpoints();
    app.MapGameEndpoints();

    app.MapGet("/api/health", () => new { status = "healthy" })
        .WithName("HealthCheck")
        .WithTags("System")
        .WithSummary("Check API health")
        .WithDescription("Returns the current health status of the API. Used for monitoring and load balancer health checks.")
        .Produces<object>(StatusCodes.Status200OK);

    app.MapPost("/api/admin/seed", (InitialSeedJob job) =>
    {
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Initial seed started", jobId };
    })
    .WithName("TriggerSeed")
    .WithTags("Admin")
    .WithSummary("Trigger initial data seed")
    .WithDescription("Starts a background job to perform the initial data import from MoneyPuck. This downloads and imports all historical data. Only run once during initial setup. Requires X-Api-Key header.")
    .Produces<object>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status401Unauthorized)
    .AddEndpointFilter<ApiKeyFilter>();

    app.MapPost("/api/admin/sync", (NightlySyncJob job) =>
    {
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Nightly sync started", jobId };
    })
    .WithName("TriggerSync")
    .WithTags("Admin")
    .WithSummary("Trigger nightly data sync")
    .WithDescription("Starts a background job to sync the latest data from MoneyPuck. This is normally run automatically at 4 AM EST but can be triggered manually. Requires X-Api-Key header.")
    .Produces<object>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status401Unauthorized)
    .AddEndpointFilter<ApiKeyFilter>();

    app.MapPost("/api/admin/sync-bios", (WeeklyBioSyncJob job) =>
    {
        var jobId = BackgroundJob.Enqueue(() => job.RunAsync(CancellationToken.None));
        return new { message = "Bio sync started", jobId };
    })
    .WithName("TriggerBioSync")
    .WithTags("Admin")
    .WithSummary("Trigger player bio sync")
    .WithDescription("Starts a background job to sync player biographical data (names, headshots, etc.) from the NHL API. This is normally run automatically weekly. Requires X-Api-Key header.")
    .Produces<object>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status401Unauthorized)
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
