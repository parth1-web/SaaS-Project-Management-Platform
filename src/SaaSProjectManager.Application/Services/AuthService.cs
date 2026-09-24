using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Entities;

namespace SaaSProjectManager.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IPasswordHasher<User> _hasher;

    public AuthService(IApplicationDbContext db, IJwtService jwt, IPasswordHasher<User> hasher)
    {
        _db = db;
        _jwt = jwt;
        _hasher = hasher;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Email == email, ct);
        if (exists) throw new ConflictException("Email already registered.");

        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user == null || !user.IsActive)
            throw new UnauthorizedException("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedException("Invalid email or password.");

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == refreshToken, ct);

        if (stored == null || !stored.IsActive)
            throw new UnauthorizedException("Invalid refresh token.");

        stored.RevokedAt = DateTime.UtcNow;

        var user = stored.User;
        var accessToken = _jwt.GenerateAccessToken(user.Id, user.Email);
        var newRefresh = _jwt.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = newRefresh,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new AuthResponse(user.Id, user.Email, user.FullName, accessToken, _jwt.GetAccessTokenExpiry(), newRefresh);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == refreshToken, ct);
        if (stored != null && !stored.IsRevoked)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) throw new NotFoundException("User not found.");
        return new UserDto(user.Id, user.FirstName, user.LastName, user.FullName, user.Email, user.IsActive, user.CreatedAt);
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var accessToken = _jwt.GenerateAccessToken(user.Id, user.Email);
        var refreshToken = _jwt.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        return new AuthResponse(user.Id, user.Email, user.FullName, accessToken, _jwt.GetAccessTokenExpiry(), refreshToken);
    }
}
