using Backend.Api.Data;
using Backend.Api.Services;
using Backend.Api.Services.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------- Database ----------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AppDb")));

// ---------- Authentication (Keycloak JWT) ----------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Keycloak:Authority"];
        options.Audience = builder.Configuration["Keycloak:Audience"];
        options.RequireHttpsMetadata = false; // dev only

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            // Accept tokens from the browser-facing issuer URL
            ValidIssuers = [
                builder.Configuration["Keycloak:Authority"] ?? "",
                builder.Configuration["Keycloak:ExternalAuthority"] ?? ""
            ],
            ValidateAudience = false,  // Keycloak audience handling
            ValidateLifetime = true,
        };

        // Support token via query string (needed for SSE EventSource)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) &&
                    context.Request.Query.TryGetValue("access_token", out var token))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var identity = context.Principal?.Identity as System.Security.Claims.ClaimsIdentity;
                if (identity == null) return Task.CompletedTask;

                // Extract realm roles from the raw JWT payload
                if (context.SecurityToken is Microsoft.IdentityModel.JsonWebTokens.JsonWebToken jwt)
                {
                    if (jwt.TryGetPayloadValue<System.Text.Json.JsonElement>("realm_access", out var realmAccess))
                    {
                        if (realmAccess.TryGetProperty("roles", out var roles))
                        {
                            foreach (var role in roles.EnumerateArray())
                            {
                                var roleValue = role.GetString();
                                if (roleValue != null)
                                {
                                    identity.AddClaim(new System.Security.Claims.Claim(
                                        System.Security.Claims.ClaimTypes.Role, roleValue));
                                }
                            }
                        }
                    }
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ---------- Services ----------
builder.Services.AddSingleton<AgentUrlValidator>();
builder.Services.AddSingleton<SseBroadcaster>();
builder.Services.AddSingleton<MeasurementProxyService>(sp =>
    new MeasurementProxyService(
        new HttpClient(),
        sp.GetRequiredService<ILogger<MeasurementProxyService>>()));

builder.Services.AddHostedService<AgentHealthMonitor>();

// ---------- Controllers + CORS ----------
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:3000"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ---------- Ensure DB is created ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
}

// ---------- Middleware ----------
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ---------- Health check ----------
app.MapGet("/health", () => Results.Ok(new { healthy = true }))
    .AllowAnonymous();

app.Run();
