using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class LineImporter(AppDbContext db, ILogger<LineImporter> logger)
{
  private readonly AppDbContext _db = db;
  private readonly ILogger<LineImporter> _logger = logger;

  public async Task<int> ImportAsync(IEnumerable<LineRecord> lines)
  {
    var count = 0;
    var now = DateTime.UtcNow;

    // Track processed records to avoid duplicates within the same batch
    var processedKeys = new HashSet<(int Season, string Team, string Situation, int Player1Id, int Player2Id, int? Player3Id)>();

    // Cache player lookups by last name for performance
    // Line names use last names only (e.g., "Abdelkader-Weiss-Alfredsson")
    // Use the LastName field if available, otherwise extract from Name
    var players = await _db.Players
        .Where(p => !string.IsNullOrEmpty(p.Name))
        .Select(p => new { p.Id, p.Name, p.LastName, p.Position })
        .ToListAsync();

    // Load historical team data from skater seasons to disambiguate players
    var playerSeasonTeams = await _db.SkaterSeasons
        .Select(s => new { s.PlayerId, s.Season, s.Team })
        .Distinct()
        .ToListAsync();

    // Helper to get last name - prefer LastName field, fall back to extracting from Name
    string GetLastName(string? lastName, string name) =>
        !string.IsNullOrEmpty(lastName) ? lastName : ExtractLastName(name);

    // Build lookup: (lastName, season, team) -> list of (playerId, position)
    var playerSeasonTeamLookup = playerSeasonTeams
        .Join(players, pst => pst.PlayerId, p => p.Id, (pst, p) => new { pst.PlayerId, pst.Season, pst.Team, p.Name, p.LastName, p.Position })
        .GroupBy(x => (LastName: GetLastName(x.LastName, x.Name).ToLowerInvariant(), x.Season, Team: x.Team.ToUpperInvariant()))
        .Where(g => !string.IsNullOrEmpty(g.Key.LastName))
        .ToDictionary(g => g.Key, g => g.Select(x => new { x.PlayerId, x.Position }).Distinct().ToList());

    // Also keep a simple last name lookup as fallback
    var playersByLastName = players
        .GroupBy(p => GetLastName(p.LastName, p.Name).ToLowerInvariant())
        .Where(g => !string.IsNullOrEmpty(g.Key))
        .ToDictionary(g => g.Key, g => g.ToList());

    // Build set of known last names (including multi-word like "Eriksson Ek", hyphenated like "Sandin-Pellikka")
    var knownLastNames = players
        .Select(p => GetLastName(p.LastName, p.Name).ToLowerInvariant())
        .Where(n => !string.IsNullOrEmpty(n))
        .ToHashSet();

    foreach (var record in lines)
    {
      // Parse player names from line name, using known names to handle hyphenated surnames
      var playerNames = ParsePlayerNames(record.Name, knownLastNames);
      if (playerNames.Count < 2)
      {
        _logger.LogWarning("Skipping line with invalid name format: {LineName}", record.Name);
        continue;
      }

      // Look up player IDs by last name, using season+team+position to disambiguate
      var playerIds = new List<int>();
      var allPlayersFound = true;
      var isDefenseLine = record.Position.Equals("D", StringComparison.OrdinalIgnoreCase);

      foreach (var lastName in playerNames)
      {
        var lastNameLower = lastName.ToLowerInvariant();
        var seasonTeamKey = (lastNameLower, record.Season, record.Team.ToUpperInvariant());

        // First try exact match: same last name, season, and team
        if (playerSeasonTeamLookup.TryGetValue(seasonTeamKey, out var exactMatches))
        {
          // Filter by position if multiple matches
          var filtered = exactMatches;
          if (exactMatches.Count > 1)
          {
            filtered = isDefenseLine
                ? exactMatches.Where(p => IsDefensePosition(p.Position)).ToList()
                : exactMatches.Where(p => IsForwardPosition(p.Position)).ToList();
          }

          if (filtered.Count == 1)
          {
            playerIds.Add(filtered[0].PlayerId);
          }
          else if (filtered.Count > 1)
          {
            _logger.LogWarning("Ambiguous player match for {LastName} in line {LineName} (season {Season}, team {Team}, position {Position}), found {Count} players",
                lastName, record.Name, record.Season, record.Team, record.Position, filtered.Count);
            allPlayersFound = false;
            break;
          }
          else
          {
            // Position filter eliminated all matches, try without filter
            if (exactMatches.Count == 1)
            {
              playerIds.Add(exactMatches[0].PlayerId);
            }
            else
            {
              _logger.LogWarning("Ambiguous player match for {LastName} in line {LineName} (season {Season}, team {Team}), found {Count} players (position filter found none)",
                  lastName, record.Name, record.Season, record.Team, exactMatches.Count);
              allPlayersFound = false;
              break;
            }
          }
        }
        else if (playersByLastName.TryGetValue(lastNameLower, out var fallbackMatches))
        {
          // Fallback: try simple last name lookup with position filtering
          var filtered = fallbackMatches;
          if (fallbackMatches.Count > 1)
          {
            filtered = isDefenseLine
                ? fallbackMatches.Where(p => IsDefensePosition(p.Position)).ToList()
                : fallbackMatches.Where(p => IsForwardPosition(p.Position)).ToList();
          }

          if (filtered.Count == 1)
          {
            playerIds.Add(filtered[0].Id);
          }
          else
          {
            _logger.LogWarning("Ambiguous player match for {LastName} in line {LineName} (team {Team}), found {Count} players - no season/team match",
                lastName, record.Name, record.Team, filtered.Count > 0 ? filtered.Count : fallbackMatches.Count);
            allPlayersFound = false;
            break;
          }
        }
        else
        {
          _logger.LogWarning("Player not found: {PlayerName} in line {LineName}", lastName, record.Name);
          allPlayersFound = false;
          break;
        }
      }

      if (!allPlayersFound)
      {
        continue;
      }

      // Sort player IDs for consistent ordering in unique constraint
      playerIds.Sort();

      var player1Id = playerIds[0];
      var player2Id = playerIds[1];
      int? player3Id = playerIds.Count > 2 ? playerIds[2] : null;

      // Skip if we've already processed this combination in this batch
      var key = (record.Season, record.Team, record.Situation, player1Id, player2Id, player3Id);
      if (!processedKeys.Add(key))
      {
        continue;
      }

      // Upsert line combination
      var existing = await _db.LineCombinations
          .FirstOrDefaultAsync(l =>
              l.Season == record.Season &&
              l.Team == record.Team &&
              l.Situation == record.Situation &&
              l.Player1Id == player1Id &&
              l.Player2Id == player2Id &&
              l.Player3Id == player3Id);

      if (existing == null)
      {
        _db.LineCombinations.Add(new LineCombination
        {
          Season = record.Season,
          Team = record.Team,
          Situation = record.Situation,
          Player1Id = player1Id,
          Player2Id = player2Id,
          Player3Id = player3Id,
          GamesPlayed = record.GamesPlayed,
          IceTimeSeconds = (int)record.IceTime,
          GoalsFor = (int)record.GoalsFor,
          GoalsAgainst = (int)record.GoalsAgainst,
          ExpectedGoalsFor = (decimal)record.XGoalsFor,
          ExpectedGoalsAgainst = (decimal)record.XGoalsAgainst,
          ExpectedGoalsPct = (decimal)record.XGoalsPercentage,
          CorsiFor = (int)record.ShotAttemptsFor,
          CorsiAgainst = (int)record.ShotAttemptsAgainst,
          CorsiPct = (decimal)record.CorsiPercentage,
          CreatedAt = now,
          UpdatedAt = now
        });
      }
      else
      {
        existing.GamesPlayed = record.GamesPlayed;
        existing.IceTimeSeconds = (int)record.IceTime;
        existing.GoalsFor = (int)record.GoalsFor;
        existing.GoalsAgainst = (int)record.GoalsAgainst;
        existing.ExpectedGoalsFor = (decimal)record.XGoalsFor;
        existing.ExpectedGoalsAgainst = (decimal)record.XGoalsAgainst;
        existing.ExpectedGoalsPct = (decimal)record.XGoalsPercentage;
        existing.CorsiFor = (int)record.ShotAttemptsFor;
        existing.CorsiAgainst = (int)record.ShotAttemptsAgainst;
        existing.CorsiPct = (decimal)record.CorsiPercentage;
        existing.UpdatedAt = now;
      }

      count++;
    }

    await _db.SaveChangesAsync();
    _logger.LogInformation("Imported {Count} line combinations", count);
    return count;
  }

  private static List<string> ParsePlayerNames(string lineName, HashSet<string> knownLastNames)
  {
    // Line names are hyphen-separated: "Bedard-Donato-Mikheyev"
    // But some players have hyphenated last names (e.g., "Sandin-Pellikka")
    // Use known names to correctly parse these cases
    var parts = lineName.Split('-', StringSplitOptions.RemoveEmptyEntries)
                        .Select(n => n.Trim())
                        .ToList();

    if (parts.Count <= 2)
      return parts;

    // Try to greedily match known last names, joining parts as needed
    var result = new List<string>();
    var i = 0;

    while (i < parts.Count)
    {
      // Try matching longest possible name first (up to 3 parts for names like "Van Der Gulik")
      var matched = false;
      for (var len = Math.Min(3, parts.Count - i); len >= 1; len--)
      {
        var candidate = string.Join("-", parts.Skip(i).Take(len));
        if (knownLastNames.Contains(candidate.ToLowerInvariant()))
        {
          result.Add(candidate);
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched)
      {
        // No known name matched, take single part
        result.Add(parts[i]);
        i++;
      }
    }

    return result;
  }

  private static bool IsDefensePosition(string? position) =>
      position != null && position.Equals("D", StringComparison.OrdinalIgnoreCase);

  private static bool IsForwardPosition(string? position) =>
      position != null && position.ToUpperInvariant() is "C" or "L" or "R" or "LW" or "RW" or "F" or "W";

  private static string ExtractLastName(string fullName)
  {
    // Extract last name from full name (e.g., "Justin Abdelkader" -> "Abdelkader")
    // Handle multi-word last names with common prefixes
    if (string.IsNullOrWhiteSpace(fullName))
      return "";

    var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length == 0)
      return "";

    if (parts.Length == 1)
      return parts[0];

    // Check for common last name prefixes and include them
    // e.g., "Martin St. Louis" -> "St. Louis", "David Van Der Gulik" -> "Van Der Gulik"
    var prefixes = new[] { "St.", "St", "Van", "De", "Del", "Da", "La", "Le", "Mc", "Mac", "O'" };

    for (var i = 1; i < parts.Length; i++)
    {
      if (prefixes.Any(p => parts[i].Equals(p, StringComparison.OrdinalIgnoreCase)))
      {
        // Found a prefix, return everything from here to end
        return string.Join(" ", parts.Skip(i));
      }
    }

    // No prefix found, return last part (handles hyphenated names like "Sandin-Pellikka")
    return parts[^1];
  }
}
