namespace Backend.Api.Models;

/// <summary>DTOs for API requests and responses.</summary>

public record RegisterAgentRequest(string Name, string BaseUrl);

public record AgentDto(
    Guid Id,
    string Name,
    string BaseUrl,
    string Status,
    string? LastError,
    DateTime CreatedAt,
    DateTime LastCheckedAt
);

public record AgentStatusResponse(string State, int ReadingCount, string? Error);

public record MeasurementDataPoint(string Timestamp, double Temperature, double Humidity, double Pressure);

/// <summary>Server-Sent Event payload.</summary>
public record SseEvent(string Type, object Data);
