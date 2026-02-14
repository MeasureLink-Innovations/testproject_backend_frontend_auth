using Backend.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

/// <summary>
/// SSE endpoint – clients connect here to receive real-time events
/// about agent state changes and measurement data.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly SseBroadcaster _sse;

    public EventsController(SseBroadcaster sse)
    {
        _sse = sse;
    }

    /// <summary>
    /// Opens an SSE stream. The connection stays open until the client disconnects.
    /// Events: agent_status_changed, agent_registered, agent_removed, measurement_data
    /// </summary>
    [HttpGet]
    public async Task Stream(CancellationToken cancellationToken)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        await Response.Body.FlushAsync(cancellationToken);

        var writer = new StreamWriter(Response.Body) { AutoFlush = false };

        // Send initial heartbeat
        await writer.WriteAsync(": connected\n\n");
        await writer.FlushAsync(cancellationToken);

        using var subscription = _sse.Subscribe(writer);

        // Keep the connection open until the client disconnects
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                // Send a heartbeat comment every 30 seconds to keep connection alive
                await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
                await writer.WriteAsync(": heartbeat\n\n");
                await writer.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected – normal
        }
    }
}
