namespace SaaSProjectManager.Application.DTOs;

public record RegisterRequest(string FirstName, string LastName, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(
    Guid UserId,
    string Email,
    string FullName,
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken);

public record UserDto(Guid Id, string FirstName, string LastName, string FullName, string Email, bool IsActive, DateTime CreatedAt);
