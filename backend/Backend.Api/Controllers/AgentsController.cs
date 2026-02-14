using Backend.Api.Data;
using Backend.Api.Models;
using Backend.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AgentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MeasurementProxyService _proxy;
    private readonly SseBroadcaster _sse;

    public AgentsController(AppDbContext db, MeasurementProxyService proxy, SseBroadcaster sse)
    {
        _db = db;
        _proxy = proxy;
        _sse = sse;
    }

    /// <summary>List all registered agents.</summary>
    [HttpGet]
    public async Task<ActionResult<List<AgentDto>>> GetAll()
    {
        var agents = await _db.Agents
            .OrderBy(a => a.CreatedAt)
            .Select(a => new AgentDto(
                a.Id, a.Name, a.BaseUrl, a.Status,
                a.LastError, a.CreatedAt, a.LastCheckedAt))
            .ToListAsync();

        return Ok(agents);
    }

    /// <summary>Get a single agent by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AgentDto>> GetById(Guid id)
    {
        var a = await _db.Agents.FindAsync(id);
        if (a == null) return NotFound();

        return Ok(new AgentDto(
            a.Id, a.Name, a.BaseUrl, a.Status,
            a.LastError, a.CreatedAt, a.LastCheckedAt));
    }

    /// <summary>Register a new measurement agent.</summary>
    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<AgentDto>> Register([FromBody] RegisterAgentRequest req)
    {
        var agent = new Agent
        {
            Name = req.Name,
            BaseUrl = req.BaseUrl.TrimEnd('/')
        };

        _db.Agents.Add(agent);
        await _db.SaveChangesAsync();

        var dto = new AgentDto(
            agent.Id, agent.Name, agent.BaseUrl, agent.Status,
            agent.LastError, agent.CreatedAt, agent.LastCheckedAt);

        await _sse.BroadcastAsync("agent_registered", new
        {
            agentId = agent.Id,
            name = agent.Name,
            baseUrl = agent.BaseUrl,
            timestamp = DateTime.UtcNow
        });

        return CreatedAtAction(nameof(GetById), new { id = agent.Id }, dto);
    }

    /// <summary>Remove a registered agent.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var agent = await _db.Agents.FindAsync(id);
        if (agent == null) return NotFound();

        _db.Agents.Remove(agent);
        await _db.SaveChangesAsync();

        await _sse.BroadcastAsync("agent_removed", new
        {
            agentId = id,
            name = agent.Name,
            timestamp = DateTime.UtcNow
        });

        return NoContent();
    }

    /// <summary>Start measurement on an agent.</summary>
    [HttpPost("{id:guid}/start")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Start(Guid id)
    {
        var agent = await _db.Agents.FindAsync(id);
        if (agent == null) return NotFound();

        var ok = await _proxy.StartAsync(agent.BaseUrl);
        if (!ok) return StatusCode(502, new { message = "Failed to start agent" });

        agent.Status = "running";
        await _db.SaveChangesAsync();

        await _sse.BroadcastAsync("agent_status_changed", new
        {
            agentId = agent.Id,
            name = agent.Name,
            previousStatus = "idle",
            newStatus = "running",
            timestamp = DateTime.UtcNow
        });

        return Ok(new { message = "Agent started" });
    }

    /// <summary>Stop measurement on an agent.</summary>
    [HttpPost("{id:guid}/stop")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Stop(Guid id)
    {
        var agent = await _db.Agents.FindAsync(id);
        if (agent == null) return NotFound();

        var ok = await _proxy.StopAsync(agent.BaseUrl);
        if (!ok) return StatusCode(502, new { message = "Failed to stop agent" });

        agent.Status = "idle";
        await _db.SaveChangesAsync();

        await _sse.BroadcastAsync("agent_status_changed", new
        {
            agentId = agent.Id,
            name = agent.Name,
            previousStatus = "running",
            newStatus = "idle",
            timestamp = DateTime.UtcNow
        });

        return Ok(new { message = "Agent stopped" });
    }

    /// <summary>Reset an agent after a crash.</summary>
    [HttpPost("{id:guid}/reset")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Reset(Guid id)
    {
        var agent = await _db.Agents.FindAsync(id);
        if (agent == null) return NotFound();

        var ok = await _proxy.ResetAsync(agent.BaseUrl);
        if (!ok) return StatusCode(502, new { message = "Failed to reset agent" });

        agent.Status = "idle";
        agent.LastError = null;
        await _db.SaveChangesAsync();

        await _sse.BroadcastAsync("agent_status_changed", new
        {
            agentId = agent.Id,
            name = agent.Name,
            previousStatus = "crashed",
            newStatus = "idle",
            timestamp = DateTime.UtcNow
        });

        return Ok(new { message = "Agent reset" });
    }

    /// <summary>Get latest measurement data from an agent.</summary>
    [HttpGet("{id:guid}/data")]
    public async Task<IActionResult> GetData(Guid id, [FromQuery] int n = 20)
    {
        var agent = await _db.Agents.FindAsync(id);
        if (agent == null) return NotFound();

        var data = await _proxy.GetDataAsync(agent.BaseUrl, n);
        return Ok(data);
    }
}
