using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.Infrastructure.Auth;

public class JwtSettings
{
    public string Secret { get; set; } = "dev-super-secret-key-change-in-production-min-32-chars!!";
    public string Issuer { get; set; } = "SaaSProjectManager";
    public string Audience { get; set; } = "SaaSProjectManager.Client";
    public int AccessTokenMinutes { get; set; } = 60;
}

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;
    public JwtService(IConfiguration config)
    {
        _settings = new JwtSettings
        {
            Secret = config["Jwt:Secret"] ?? "dev-super-secret-key-change-in-production-min-32-chars!!",
            Issuer = config["Jwt:Issuer"] ?? "SaaSProjectManager",
            Audience = config["Jwt:Audience"] ?? "SaaSProjectManager.Client",
            AccessTokenMinutes = int.TryParse(config["Jwt:AccessTokenMinutes"], out var m) ? m : 60
        };
    }

    // For tests
    public JwtService(JwtSettings settings) { _settings = settings; }

    public string GenerateAccessToken(Guid userId, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenMinutes),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public DateTime GetAccessTokenExpiry() => DateTime.UtcNow.AddMinutes(_settings.AccessTokenMinutes);
}
