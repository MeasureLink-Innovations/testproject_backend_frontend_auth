using Backend.Api.Services.Security;
using Xunit;

namespace Backend.Tests;

public class AgentUrlValidationTests
{
    private readonly AgentUrlValidator _validator = new();

    [Theory]
    [InlineData("http://agent1:5100")]
    [InlineData("https://agent-secure.internal")]
    [InlineData("http://192.168.1.50:8080")]
    public void IsSafeUrl_ValidUrls_ReturnsTrue(string url)
    {
        Assert.True(_validator.IsSafeUrl(url));
    }

    [Theory]
    [InlineData("ftp://example.com")]
    [InlineData("file:///etc/passwd")]
    [InlineData("javascript:alert(1)")]
    [InlineData("")]
    [InlineData(null)]
    public void IsSafeUrl_InvalidScheme_ReturnsFalse(string url)
    {
        Assert.False(_validator.IsSafeUrl(url));
    }

    [Theory]
    [InlineData("http://localhost:5000")]
    [InlineData("http://127.0.0.1")]
    [InlineData("http://[::1]")]
    [InlineData("http://0.0.0.0")]
    [InlineData("http://127.0.0.5")] // Loopback range
    [InlineData("http://169.254.169.254/latest/meta-data")] // AWS Metadata
    [InlineData("http://169.254.0.1")] // Link-local
    public void IsSafeUrl_BlockedHosts_ReturnsFalse(string url)
    {
        Assert.False(_validator.IsSafeUrl(url));
    }
}
