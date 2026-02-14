using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models;

public class Agent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string BaseUrl { get; set; } = string.Empty;

    public string Status { get; set; } = "unknown"; // idle | running | crashed | unreachable

    public string? LastError { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastCheckedAt { get; set; } = DateTime.UtcNow;
}
