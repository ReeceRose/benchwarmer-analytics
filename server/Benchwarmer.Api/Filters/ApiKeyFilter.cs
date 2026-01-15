namespace Benchwarmer.Api.Filters;

public class ApiKeyFilter : IEndpointFilter
{
    private const string ApiKeyHeader = "X-API-Key";

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var configuredKey = configuration["AdminApiKey"];

        if (string.IsNullOrEmpty(configuredKey))
        {
            return Results.Problem(
                detail: "Admin API key not configured",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyHeader, out var providedKey))
        {
            return Results.Problem(
                detail: "API key required",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        if (!string.Equals(configuredKey, providedKey, StringComparison.Ordinal))
        {
            return Results.Problem(
                detail: "Invalid API key",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        return await next(context);
    }
}
