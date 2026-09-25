using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.Application.Common;

/// <summary>
/// Keeps dashboard stats fresh. DashboardService caches per user as
/// dashboard:{userId}: (all orgs) and dashboard:{userId}:{orgId}, so every
/// mutation that can change those numbers must evict the affected members'
/// keys. Evicting extra keys is always safe (they recompute on next read).
/// </summary>
internal static class DashboardCache
{
    public static async Task EvictForOrganizationAsync(
        IApplicationDbContext db,
        ICacheService cache,
        Guid orgId,
        IEnumerable<Guid>? extraUserIds = null,
        CancellationToken ct = default)
    {
        var ids = await db.OrganizationMembers
            .Where(m => m.OrganizationId == orgId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        if (extraUserIds != null) ids.AddRange(extraUserIds);
        foreach (var uid in ids.Distinct())
        {
            await cache.RemoveAsync($"dashboard:{uid}:", ct);
            await cache.RemoveAsync($"dashboard:{uid}:{orgId}", ct);
        }
    }
}
