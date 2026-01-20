using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
  public DbSet<Team> Teams => Set<Team>();
  public DbSet<Player> Players => Set<Player>();
  public DbSet<SkaterSeason> SkaterSeasons => Set<SkaterSeason>();
  public DbSet<TeamSeason> TeamSeasons => Set<TeamSeason>();
  public DbSet<LineCombination> LineCombinations => Set<LineCombination>();
  public DbSet<Shot> Shots => Set<Shot>();
  public DbSet<Game> Games => Set<Game>();

  // Materialized views (read-only)
  public DbSet<ChemistryPairView> ChemistryPairs => Set<ChemistryPairView>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    // Use snake_case for PostgreSQL
    foreach (var entity in modelBuilder.Model.GetEntityTypes())
    {
      entity.SetTableName(ToSnakeCase(entity.GetTableName()!));
      foreach (var property in entity.GetProperties())
      {
        property.SetColumnName(ToSnakeCase(property.Name));
      }
    }

    // Team
    modelBuilder.Entity<Team>(e =>
    {
      e.HasIndex(t => t.Abbreviation).IsUnique();
    });

    // Player
    modelBuilder.Entity<Player>(e =>
    {
      e.HasIndex(p => p.CurrentTeamAbbreviation);
      e.HasIndex(p => p.Name);
    });

    // SkaterSeason
    modelBuilder.Entity<SkaterSeason>(e =>
    {
      e.HasOne(s => s.Player)
              .WithMany()
              .HasForeignKey(s => s.PlayerId);

      e.HasIndex(s => new { s.PlayerId, s.Season, s.Team, s.Situation, s.IsPlayoffs }).IsUnique();
      e.HasIndex(s => new { s.Season, s.Team });
    });

    // TeamSeason
    modelBuilder.Entity<TeamSeason>(e =>
    {
      e.HasOne(t => t.Team)
              .WithMany()
              .HasForeignKey(t => t.TeamAbbreviation)
              .HasPrincipalKey(t => t.Abbreviation);

      e.HasIndex(t => new { t.TeamAbbreviation, t.Season, t.Situation }).IsUnique();
      e.HasIndex(t => t.Season);
    });

    // LineCombination
    modelBuilder.Entity<LineCombination>(e =>
    {
      e.HasOne(l => l.Player1).WithMany().HasForeignKey(l => l.Player1Id);
      e.HasOne(l => l.Player2).WithMany().HasForeignKey(l => l.Player2Id);
      e.HasOne(l => l.Player3).WithMany().HasForeignKey(l => l.Player3Id);

      e.HasIndex(l => new { l.Season, l.Team, l.Situation, l.Player1Id, l.Player2Id, l.Player3Id }).IsUnique();
      e.HasIndex(l => new { l.Season, l.Team });
    });

    // Shot (no FK constraints - player IDs stored but not enforced)
    modelBuilder.Entity<Shot>(e =>
    {
      e.Ignore(s => s.Shooter);
      e.Ignore(s => s.Goalie);

      e.HasIndex(s => s.ShotId).IsUnique();
      e.HasIndex(s => s.Season);
      e.HasIndex(s => s.GameId);
      e.HasIndex(s => s.ShooterPlayerId);
      e.HasIndex(s => s.GoaliePlayerId);
      e.HasIndex(s => new { s.Season, s.IsGoal });
      e.HasIndex(s => new { s.Season, s.TeamCode });
    });

    // Game
    modelBuilder.Entity<Game>(e =>
    {
      e.HasIndex(g => g.GameId).IsUnique();
      e.HasIndex(g => g.GameDate);
      e.HasIndex(g => new { g.GameDate, g.GameState });
    });

    // ChemistryPairView (materialized view - read only)
    modelBuilder.Entity<ChemistryPairView>(e =>
    {
      e.HasNoKey();
      e.ToView("chemistry_pairs");
      e.Property(c => c.Player1Id).HasColumnName("player1_id");
      e.Property(c => c.Player2Id).HasColumnName("player2_id");
      e.Property(c => c.Player1Name).HasColumnName("player1_name");
      e.Property(c => c.Player2Name).HasColumnName("player2_name");
      e.Property(c => c.Team).HasColumnName("team");
      e.Property(c => c.Season).HasColumnName("season");
      e.Property(c => c.Situation).HasColumnName("situation");
      e.Property(c => c.TotalIceTimeSeconds).HasColumnName("total_ice_time_seconds");
      e.Property(c => c.GamesPlayed).HasColumnName("games_played");
      e.Property(c => c.GoalsFor).HasColumnName("goals_for");
      e.Property(c => c.GoalsAgainst).HasColumnName("goals_against");
      e.Property(c => c.XGoalsFor).HasColumnName("x_goals_for");
      e.Property(c => c.XGoalsAgainst).HasColumnName("x_goals_against");
      e.Property(c => c.CorsiFor).HasColumnName("corsi_for");
      e.Property(c => c.CorsiAgainst).HasColumnName("corsi_against");
    });

  }

  private static string ToSnakeCase(string name)
  {
    return string.Concat(name.Select((c, i) =>
        i > 0 && char.IsUpper(c) ? "_" + c : c.ToString())).ToLower();
  }
}