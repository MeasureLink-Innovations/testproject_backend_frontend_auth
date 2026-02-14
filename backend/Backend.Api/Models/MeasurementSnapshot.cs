using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models;

public class MeasurementSnapshot
{
    [Key]
    public long Id { get; set; }

    public Guid AgentId { get; set; }

    public string Timestamp { get; set; } = string.Empty;

    public double Temperature { get; set; }

    public double Humidity { get; set; }

    public double Pressure { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
}
