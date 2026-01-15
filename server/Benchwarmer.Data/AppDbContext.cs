using Benchwarmer.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Benchwarmer.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<SkaterSeason> SkaterSeasons => Set<SkaterSeason>();
    public DbSet<LineCombination> LineCombinations => Set<LineCombination>();
    public DbSet<IngestionLog> IngestionLogs => Set<IngestionLog>();

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

            e.HasIndex(s => new { s.PlayerId, s.Season, s.Team, s.Situation }).IsUnique();
            e.HasIndex(s => new { s.Season, s.Team });
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

        // IngestionLog
        modelBuilder.Entity<IngestionLog>(e =>
        {
            e.HasIndex(i => new { i.Dataset, i.Season });
        });
    }

    private static string ToSnakeCase(string name)
    {
        return string.Concat(name.Select((c, i) =>
            i > 0 && char.IsUpper(c) ? "_" + c : c.ToString())).ToLower();
    }
}