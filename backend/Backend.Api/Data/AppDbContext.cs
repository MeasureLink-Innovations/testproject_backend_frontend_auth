using Backend.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<MeasurementSnapshot> MeasurementSnapshots => Set<MeasurementSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Agent>(e =>
        {
            e.HasIndex(a => a.Name).IsUnique();
            e.Property(a => a.Status).HasDefaultValue("unknown");
        });

        modelBuilder.Entity<MeasurementSnapshot>(e =>
        {
            e.HasIndex(m => m.AgentId);
            e.HasIndex(m => m.ReceivedAt);
        });
    }
}
