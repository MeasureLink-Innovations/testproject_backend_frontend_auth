using System.Text.Json;
using Backend.Api.Models;

namespace Backend.Api.Services;

/// <summary>
/// HTTP client wrapper to proxy commands to Flask measurement agents.
/// </summary>
public class MeasurementProxyService
{
    private readonly HttpClient _http;
    private readonly ILogger<MeasurementProxyService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public MeasurementProxyService(HttpClient http, ILogger<MeasurementProxyService> logger)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(5);
        _logger = logger;
    }

    public async Task<AgentStatusResponse?> GetStatusAsync(string baseUrl)
    {
        try
        {
            var resp = await _http.GetAsync($"{baseUrl}/status");
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AgentStatusResponse>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get status from {BaseUrl}", baseUrl);
            return null;
        }
    }

    public async Task<bool> StartAsync(string baseUrl)
    {
        try
        {
            var resp = await _http.PostAsync($"{baseUrl}/start", null);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to start agent at {BaseUrl}", baseUrl);
            return false;
        }
    }

    public async Task<bool> StopAsync(string baseUrl)
    {
        try
        {
            var resp = await _http.PostAsync($"{baseUrl}/stop", null);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to stop agent at {BaseUrl}", baseUrl);
            return false;
        }
    }

    public async Task<bool> ResetAsync(string baseUrl)
    {
        try
        {
            var resp = await _http.PostAsync($"{baseUrl}/reset", null);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to reset agent at {BaseUrl}", baseUrl);
            return false;
        }
    }

    public async Task<List<MeasurementDataPoint>> GetDataAsync(string baseUrl, int n = 20)
    {
        try
        {
            var resp = await _http.GetAsync($"{baseUrl}/data?n={n}");
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<MeasurementDataPoint>>(json, JsonOpts) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get data from {BaseUrl}", baseUrl);
            return [];
        }
    }

    public async Task<bool> IsHealthyAsync(string baseUrl)
    {
        try
        {
            var resp = await _http.GetAsync($"{baseUrl}/health");
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
