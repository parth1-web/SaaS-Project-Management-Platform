namespace SaaSProjectManager.Application.Interfaces;

/// <summary>
/// Seeds a sample workspace into the caller's own account.
/// Safe for production: never touches other users' data.
/// </summary>
public interface IDemoService
{
    Task<DTOs.DemoSeedResponse> SeedAsync(Guid userId, CancellationToken ct = default);
}
