using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Data.Repositories;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class LineImporter(
    AppDbContext db,
    ILineRepository lineRepository,
    ILogger<LineImporter> logger)
{
    public async Task<int> ImportAsync(IEnumerable<LineRecord> lines)
    {
        var count = 0;

        // Track processed records to avoid duplicates within the same batch
        var processedKeys = new HashSet<(int Season, string Team, string Situation, int Player1Id, int Player2Id, int? Player3Id)>();

        // Cache player lookups by last name for performance
        var players = await db.Players
            .Where(p => !string.IsNullOrEmpty(p.Name))
            .Select(p => new { p.Id, p.Name, p.LastName, p.Position })
            .ToListAsync();

        // Load historical team data from skater seasons to disambiguate players
        var playerSeasonTeams = await db.SkaterSeasons
            .Select(s => new { s.PlayerId, s.Season, s.Team })
            .Distinct()
            .ToListAsync();

        // Helper to get last name
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

        // Build set of known last names
        var knownLastNames = players
            .Select(p => GetLastName(p.LastName, p.Name).ToLowerInvariant())
            .Where(n => !string.IsNullOrEmpty(n))
            .ToHashSet();

        var linesToUpsert = new List<LineCombination>();

        foreach (var record in lines)
        {
            // Parse player names from line name
            var playerNames = ParsePlayerNames(record.Name, knownLastNames);
            if (playerNames.Count < 2)
            {
                logger.LogWarning("Skipping line with invalid name format: {LineName}", record.Name);
                continue;
            }

            // Look up player IDs by last name
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
                        logger.LogWarning("Ambiguous player match for {LastName} in line {LineName}", lastName, record.Name);
                        allPlayersFound = false;
                        break;
                    }
                    else
                    {
                        if (exactMatches.Count == 1)
                        {
                            playerIds.Add(exactMatches[0].PlayerId);
                        }
                        else
                        {
                            logger.LogWarning("Ambiguous player match for {LastName} in line {LineName}", lastName, record.Name);
                            allPlayersFound = false;
                            break;
                        }
                    }
                }
                else if (playersByLastName.TryGetValue(lastNameLower, out var fallbackMatches))
                {
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
                        logger.LogWarning("Ambiguous player match for {LastName} in line {LineName}", lastName, record.Name);
                        allPlayersFound = false;
                        break;
                    }
                }
                else
                {
                    logger.LogWarning("Player not found: {PlayerName} in line {LineName}", lastName, record.Name);
                    allPlayersFound = false;
                    break;
                }
            }

            if (!allPlayersFound)
            {
                continue;
            }

            // Sort player IDs for consistent ordering
            playerIds.Sort();

            var player1Id = playerIds[0];
            var player2Id = playerIds[1];
            int? player3Id = playerIds.Count > 2 ? playerIds[2] : null;

            // Skip if we've already processed this combination
            var key = (record.Season, record.Team, record.Situation, player1Id, player2Id, player3Id);
            if (!processedKeys.Add(key))
            {
                continue;
            }

            linesToUpsert.Add(new LineCombination
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
                CorsiPct = (decimal)record.CorsiPercentage
            });

            count++;
        }

        // Upsert all lines via repository
        if (linesToUpsert.Count > 0)
        {
            await lineRepository.UpsertBatchAsync(linesToUpsert);
        }

        logger.LogInformation("Imported {Count} line combinations", count);
        return count;
    }

    private static List<string> ParsePlayerNames(string lineName, HashSet<string> knownLastNames)
    {
        var parts = lineName.Split('-', StringSplitOptions.RemoveEmptyEntries)
                            .Select(n => n.Trim())
                            .ToList();

        if (parts.Count <= 2)
            return parts;

        var result = new List<string>();
        var i = 0;

        while (i < parts.Count)
        {
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
        if (string.IsNullOrWhiteSpace(fullName))
            return "";

        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
            return "";

        if (parts.Length == 1)
            return parts[0];

        var prefixes = new[] { "St.", "St", "Van", "De", "Del", "Da", "La", "Le", "Mc", "Mac", "O'" };

        for (var i = 1; i < parts.Length; i++)
        {
            if (prefixes.Any(p => parts[i].Equals(p, StringComparison.OrdinalIgnoreCase)))
            {
                return string.Join(" ", parts.Skip(i));
            }
        }

        return parts[^1];
    }
}
