using System.Collections.Concurrent;
using System.Text.Json;
using Backend.Api.Models;

namespace Backend.Api.Services;

/// <summary>
/// In-memory SSE broadcast channel.
/// Clients subscribe via GetStream(); the health monitor and controllers
/// push events via Broadcast().
/// </summary>
public class SseBroadcaster
{
    private readonly ConcurrentDictionary<Guid, StreamWriter> _clients = new();

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>Register a new SSE client. Returns a disposable subscription.</summary>
    public SseSubscription Subscribe(StreamWriter writer)
    {
        var id = Guid.NewGuid();
        _clients.TryAdd(id, writer);
        return new SseSubscription(id, this);
    }

    /// <summary>Remove a client subscription.</summary>
    public void Unsubscribe(Guid id)
    {
        _clients.TryRemove(id, out _);
    }

    /// <summary>Push an event to all connected clients.</summary>
    public async Task BroadcastAsync(string eventType, object data)
    {
        var payload = $"event: {eventType}\ndata: {JsonSerializer.Serialize(data, JsonOpts)}\n\n";

        var deadClients = new List<Guid>();

        foreach (var (id, writer) in _clients)
        {
            try
            {
                await writer.WriteAsync(payload);
                await writer.FlushAsync();
            }
            catch
            {
                deadClients.Add(id);
            }
        }

        foreach (var id in deadClients)
        {
            _clients.TryRemove(id, out _);
        }
    }

    public int ClientCount => _clients.Count;
}

public class SseSubscription : IDisposable
{
    private readonly Guid _id;
    private readonly SseBroadcaster _broadcaster;

    public SseSubscription(Guid id, SseBroadcaster broadcaster)
    {
        _id = id;
        _broadcaster = broadcaster;
    }

    public void Dispose() => _broadcaster.Unsubscribe(_id);
}
