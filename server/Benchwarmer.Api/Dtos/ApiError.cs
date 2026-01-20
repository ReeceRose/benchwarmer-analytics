namespace Benchwarmer.Api.Dtos;

public record ApiError(string Error, string Code)
{
    // Not Found errors
    public static readonly ApiError PlayerNotFound = new("Player not found", "PLAYER_NOT_FOUND");
    public static readonly ApiError TeamNotFound = new("Team not found", "TEAM_NOT_FOUND");

    // Pagination errors
    public static readonly ApiError InvalidPagination = new("Both page and pageSize must be provided for pagination", "INVALID_PAGINATION");
    public static readonly ApiError InvalidPage = new("page must be >= 1", "INVALID_PAGE");
    public static readonly ApiError InvalidPageSize = new("pageSize must be between 1 and 100", "INVALID_PAGE_SIZE");

    // Query errors
    public static readonly ApiError MissingQuery = new("Query parameter 'q' is required", "MISSING_QUERY");

    // Comparison errors
    public static readonly ApiError InsufficientPlayers = new("At least 2 player IDs required", "INSUFFICIENT_PLAYERS");
    public static readonly ApiError TooManyPlayers = new("Maximum 5 players for comparison", "TOO_MANY_PLAYERS");

    // Sort errors
    public static readonly ApiError InvalidSortDir = new("Invalid sortDir. Valid values: asc, desc", "INVALID_SORT_DIR");

    // Factory methods for dynamic validation errors
    public static ApiError InvalidSituation(IEnumerable<string> validValues) =>
        new($"Invalid situation. Valid values: {string.Join(", ", validValues)}", "INVALID_SITUATION");

    public static ApiError InvalidLineType(IEnumerable<string> validValues) =>
        new($"Invalid lineType. Valid values: {string.Join(", ", validValues)}", "INVALID_LINE_TYPE");

    public static ApiError InvalidSortField(IEnumerable<string> validValues) =>
        new($"Invalid sortBy. Valid values: {string.Join(", ", validValues)}", "INVALID_SORT_FIELD");

    public static ApiError InvalidShotType(IEnumerable<string> validValues) =>
        new($"Invalid shotType. Valid values: {string.Join(", ", validValues)}", "INVALID_SHOT_TYPE");
}
