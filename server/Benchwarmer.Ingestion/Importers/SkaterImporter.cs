
using Benchwarmer.Data;
using Benchwarmer.Data.Entities;
using Benchwarmer.Ingestion.Parsers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Benchwarmer.Ingestion.Importers;

public class SkaterImporter(AppDbContext db, ILogger<SkaterImporter> logger)
{
  private readonly AppDbContext _db = db;
  private readonly ILogger<SkaterImporter> _logger = logger;

  public async Task<int> ImportAsync(IEnumerable<SkaterRecord> skaters)
  {
    var count = 0;
    var now = DateTime.UtcNow;

    // Group by player to upsert players first
    var playerGroups = skaters.GroupBy(s => s.PlayerId);

    foreach (var group in playerGroups)
    {
      var first = group.First();

      // Upsert player
      var player = await _db.Players.FindAsync(first.PlayerId);
      if (player == null)
      {
        player = new Player
        {
          Id = first.PlayerId,
          Name = first.Name,
          CurrentTeamAbbreviation = first.Team,
          CreatedAt = now,
          UpdatedAt = now
        };
        _db.Players.Add(player);
      }
      else
      {
        player.Name = first.Name;
        player.CurrentTeamAbbreviation = first.Team;
        player.UpdatedAt = now;
      }

      // Upsert each season/situation record
      foreach (var record in group)
      {
        var existing = await _db.SkaterSeasons
            .FirstOrDefaultAsync(s =>
                s.PlayerId == record.PlayerId &&
                s.Season == record.Season &&
                s.Team == record.Team &&
                s.Situation == record.Situation);

        if (existing == null)
        {
          _db.SkaterSeasons.Add(new SkaterSeason
          {
            PlayerId = record.PlayerId,
            Season = record.Season,
            Team = record.Team,
            Situation = record.Situation,
            GamesPlayed = record.GamesPlayed,
            IceTimeSeconds = (int)record.IceTime,
            Goals = (int)record.Goals,
            Assists = (int)(record.PrimaryAssists + record.SecondaryAssists),
            Shots = (int)record.Shots,
            ExpectedGoals = record.ExpectedGoals,
            CorsiForPct = record.CorsiPct,
            FenwickForPct = record.FenwickPct,
            CreatedAt = now,
            UpdatedAt = now
          });
        }
        else
        {
          existing.GamesPlayed = record.GamesPlayed;
          existing.IceTimeSeconds = (int)record.IceTime;
          existing.Goals = (int)record.Goals;
          existing.Assists = (int)(record.PrimaryAssists + record.SecondaryAssists);
          existing.Shots = (int)record.Shots;
          existing.ExpectedGoals = record.ExpectedGoals;
          existing.CorsiForPct = record.CorsiPct;
          existing.FenwickForPct = record.FenwickPct;
          existing.UpdatedAt = now;
        }

        count++;
      }
    }

    await _db.SaveChangesAsync();
    return count;
  }
}