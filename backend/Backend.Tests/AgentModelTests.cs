using Xunit;
using Backend.Api.Models;

namespace Backend.Tests;

public class AgentModelTests
{
    [Fact]
    public void NewAgent_ShouldHaveDefaultValues()
    {
        // Arrange & Act
        var agent = new Agent();

        // Assert
        Assert.NotEqual(Guid.Empty, agent.Id);
        Assert.Equal(string.Empty, agent.Name);
        Assert.Equal(string.Empty, agent.BaseUrl);
        Assert.Equal("unknown", agent.Status);
        Assert.Null(agent.LastError);
        Assert.True(agent.CreatedAt <= DateTime.UtcNow);
        Assert.True(agent.LastCheckedAt <= DateTime.UtcNow);
    }

    [Fact]
    public void SetProperties_ShouldUpdateValues()
    {
        // Arrange
        var agent = new Agent();
        var id = Guid.NewGuid();
        var name = "Test Agent";
        var url = "http://localhost:5000";

        // Act
        agent.Id = id;
        agent.Name = name;
        agent.BaseUrl = url;
        agent.Status = "running";

        // Assert
        Assert.Equal(id, agent.Id);
        Assert.Equal(name, agent.Name);
        Assert.Equal(url, agent.BaseUrl);
        Assert.Equal("running", agent.Status);
    }
}
