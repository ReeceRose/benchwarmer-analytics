using Hangfire.Dashboard;

namespace Benchwarmer.Api.Filters;

public class HangfireDashboardAuthFilter : IDashboardAuthorizationFilter
{
    private const string ApiKeyHeader = "X-API-Key";
    private readonly string _configuredKey;

    public HangfireDashboardAuthFilter(IConfiguration configuration)
    {
        _configuredKey = configuration["AdminApiKey"] ?? "";
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Allow in development without key for convenience
        var env = httpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        if (env.IsDevelopment())
        {
            return true;
        }

        if (string.IsNullOrEmpty(_configuredKey))
        {
            return false;
        }

        if (!httpContext.Request.Headers.TryGetValue(ApiKeyHeader, out var providedKey))
        {
            return false;
        }

        return string.Equals(_configuredKey, providedKey, StringComparison.Ordinal);
    }
}
