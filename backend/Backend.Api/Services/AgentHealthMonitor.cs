using System.Threading;
using Backend.Api.Data;
using Backend.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services;

/// <summary>
/// Background service that polls every registered agent's /status every 5 seconds.
/// Detects state changes and broadcasts SSE events.
/// </summary>
public class AgentHealthMonitor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly MeasurementProxyService _proxy;
    private readonly SseBroadcaster _sse;
    private readonly ILogger<AgentHealthMonitor> _logger;
    private readonly SemaphoreSlim _semaphore = new(20);

    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    // Limit concurrent requests to prevent socket exhaustion
    private readonly SemaphoreSlim _semaphore = new(20);

    public AgentHealthMonitor(
        IServiceScopeFactory scopeFactory,
        MeasurementProxyService proxy,
        SseBroadcaster sse,
        ILogger<AgentHealthMonitor> logger)
    {
        _scopeFactory = scopeFactory;
        _proxy = proxy;
        _sse = sse;
        _logger = logger;
    }

    public override void Dispose()
    {
        _semaphore.Dispose();
        base.Dispose();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AgentHealthMonitor started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollAllAgentsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during agent health poll");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task PollAllAgentsAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var agents = await db.Agents.ToListAsync(stoppingToken);

        // 1. Parallelize network calls to all agents (with concurrency limit)
        var tasks = agents.Select(async agent =>
        {
            await _semaphore.WaitAsync();
            try
            {
                var status = await _proxy.GetStatusAsync(agent.BaseUrl);
                List<MeasurementDataPoint> data = [];

                string newStatus;
                string? lastError;

                if (status == null)
                {
                    newStatus = "unreachable";
                    lastError = "Agent did not respond to health check";
                }
                else
                {
                    newStatus = status.State;
                    lastError = status.Error;
                }

                if (newStatus == "running")
                {
                    data = await _proxy.GetDataAsync(agent.BaseUrl, 5);
                }

                return new { Agent = agent, NewStatus = newStatus, LastError = lastError, Data = data };
            }
            finally
            {
                _semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);

        // 2. Update DB and Broadcast (Sequential)
        foreach (var result in results)
        {
            var agent = result.Agent;
            var previousStatus = agent.Status;

            agent.Status = result.NewStatus;
            agent.LastError = result.LastError;
            agent.LastCheckedAt = DateTime.UtcNow;

            // Broadcast SSE event on any state change
            if (previousStatus != agent.Status)
            {
                _logger.LogInformation(
                    "Agent {Name} ({Id}) status changed: {Old} -> {New}",
                    agent.Name, agent.Id, previousStatus, agent.Status);

                await _sse.BroadcastAsync("agent_status_changed", new
                {
                    agentId = agent.Id,
                    name = agent.Name,
                    previousStatus,
                    newStatus = agent.Status,
                    error = agent.LastError,
                    timestamp = DateTime.UtcNow
                });
            }

            // Broadcast data if available
            if (result.Data.Count > 0)
            {
                await _sse.BroadcastAsync("measurement_data", new
                {
                    agentId = agent.Id,
                    name = agent.Name,
                    readings = result.Data
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
