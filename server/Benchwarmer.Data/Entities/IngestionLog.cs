namespace Benchwarmer.Data.Entities;

public class IngestionLog
{
    public int Id { get; set; }
    public required string Dataset { get; set; }
    public int? Season { get; set; }
    public required string Status { get; set; }
    public int RecordsProcessed { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
}
