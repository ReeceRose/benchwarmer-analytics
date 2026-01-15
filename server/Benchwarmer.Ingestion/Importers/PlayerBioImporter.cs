using System.Text.RegularExpressions;
using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public partial class PlayerBioImporter(AppDbContext db, ILogger<PlayerBioImporter> logger)
{
    private readonly AppDbContext _db = db;
    private readonly ILogger<PlayerBioImporter> _logger = logger;

    public async Task<int> ImportAsync(IEnumerable<PlayerBioRecord> bios)
    {
        var count = 0;
        var now = DateTime.UtcNow;

        foreach (var bio in bios)
        {
            var (firstName, lastName) = ParseName(bio.Name);
            var heightInches = ParseHeight(bio.Height);

            var player = await _db.Players.FindAsync(bio.PlayerId);

            if (player == null)
            {
                // Create new player from bio data
                player = new Player
                {
                    Id = bio.PlayerId,
                    Name = bio.Name,
                    FirstName = firstName,
                    LastName = lastName,
                    Position = bio.PrimaryPosition ?? bio.Position,
                    CurrentTeamAbbreviation = bio.Team,
                    BirthDate = ParseBirthDate(bio.BirthDate),
                    HeightInches = heightInches,
                    WeightLbs = bio.WeightLbs.HasValue ? (int)bio.WeightLbs.Value : null,
                    Shoots = bio.Shoots,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.Players.Add(player);
            }
            else
            {
                // Update existing player with bio data
                player.FirstName = firstName;
                player.LastName = lastName;
                player.Position = bio.PrimaryPosition ?? bio.Position;
                player.BirthDate = ParseBirthDate(bio.BirthDate);
                player.HeightInches = heightInches;
                player.WeightLbs = bio.WeightLbs.HasValue ? (int)bio.WeightLbs.Value : null;
                player.Shoots = bio.Shoots;
                player.UpdatedAt = now;
            }

            count++;
        }

        await _db.SaveChangesAsync();
        return count;
    }

    private static (string? firstName, string? lastName) ParseName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return (null, null);

        var parts = name.Split(' ', 2);
        return parts.Length == 2
            ? (parts[0], parts[1])
            : (null, parts[0]);
    }

    private static int? ParseHeight(string? height)
    {
        if (string.IsNullOrEmpty(height))
            return null;

        // Parse "6' 3\"" format to inches
        var match = HeightRegex().Match(height);
        if (match.Success)
        {
            var feet = int.Parse(match.Groups[1].Value);
            var inches = int.Parse(match.Groups[2].Value);
            return (feet * 12) + inches;
        }

        return null;
    }

    private static DateOnly? ParseBirthDate(string? dateString)
    {
        if (string.IsNullOrEmpty(dateString))
            return null;

        if (DateOnly.TryParse(dateString, out var date))
            return date;

        return null;
    }

    [GeneratedRegex(@"(\d+)'\s*(\d+)""?")]
    private static partial Regex HeightRegex();
}
