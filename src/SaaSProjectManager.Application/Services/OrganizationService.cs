using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Entities;
using SaaSProjectManager.Domain.Enums;

namespace SaaSProjectManager.Application.Services;

public class OrganizationService : IOrganizationService
{
    private readonly IApplicationDbContext _db;
    private readonly IActivityLogService _activity;
    private readonly ICacheService _cache;

    public OrganizationService(IApplicationDbContext db, IActivityLogService activity, ICacheService cache)
    {
        _db = db;
        _activity = activity;
        _cache = cache;
    }

    private static string ToSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant()
            .Replace(" ", "-");
        foreach (var c in System.IO.Path.GetInvalidFileNameChars())
            slug = slug.Replace(c.ToString(), "");
        return slug + "-" + Guid.NewGuid().ToString("N")[..6];
    }

    private async Task<OrganizationMember?> GetMembershipAsync(Guid userId, Guid orgId, CancellationToken ct)
        => await _db.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId, ct);

    private async Task EnsureCanManageAsync(Guid userId, Guid orgId, CancellationToken ct)
    {
        var m = await GetMembershipAsync(userId, orgId, ct);
        if (m == null) throw new ForbiddenException("Not a member of this organization.");
        if (m.Role != OrganizationRole.Owner && m.Role != OrganizationRole.Admin)
            throw new ForbiddenException("Only Owner/Admin can manage organization.");
    }

    private async Task EnsureIsMemberAsync(Guid userId, Guid orgId, CancellationToken ct)
    {
        var m = await GetMembershipAsync(userId, orgId, ct);
        if (m == null) throw new ForbiddenException("Not a member of this organization.");
    }

    public async Task<OrganizationDto> CreateAsync(Guid userId, CreateOrganizationRequest request, CancellationToken ct = default)
    {
        var org = new Organization
        {
            Name = request.Name.Trim(),
            Slug = ToSlug(request.Name),
            Description = request.Description?.Trim()
        };
        _db.Organizations.Add(org);
        _db.OrganizationMembers.Add(new OrganizationMember
        {
            OrganizationId = org.Id,
            UserId = userId,
            Role = OrganizationRole.Owner
        });
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(org.Id, userId, "OrganizationCreated", "Organization", org.Id, $"Created organization {org.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, org.Id, ct: ct);
        return await GetByIdAsync(userId, org.Id, ct);
    }

    public async Task<PagedResult<OrganizationDto>> ListAsync(Guid userId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var query = _db.OrganizationMembers
            .Where(m => m.UserId == userId)
            .Include(m => m.Organization)
            .AsQueryable();

        var total = await query.CountAsync(ct);
        var members = await query
            .OrderByDescending(m => m.JoinedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        var items = new List<OrganizationDto>();
        foreach (var m in members)
        {
            var memberCount = await _db.OrganizationMembers.CountAsync(x => x.OrganizationId == m.OrganizationId, ct);
            var projectCount = await _db.Projects.CountAsync(p => p.OrganizationId == m.OrganizationId, ct);
            items.Add(new OrganizationDto(m.OrganizationId, m.Organization.Name, m.Organization.Slug, m.Organization.Description, memberCount, projectCount, m.Role.ToString(), m.Organization.CreatedAt));
        }

        return new PagedResult<OrganizationDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<OrganizationDto> GetByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org == null) throw new NotFoundException("Organization not found.");
        var membership = await GetMembershipAsync(userId, id, ct);
        if (membership == null) throw new ForbiddenException("Not a member of this organization.");
        var memberCount = await _db.OrganizationMembers.CountAsync(x => x.OrganizationId == id, ct);
        var projectCount = await _db.Projects.CountAsync(p => p.OrganizationId == id, ct);
        return new OrganizationDto(org.Id, org.Name, org.Slug, org.Description, memberCount, projectCount, membership.Role.ToString(), org.CreatedAt);
    }

    public async Task<OrganizationDto> UpdateAsync(Guid userId, Guid id, UpdateOrganizationRequest request, CancellationToken ct = default)
    {
        await EnsureCanManageAsync(userId, id, ct);
        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org == null) throw new NotFoundException("Organization not found.");
        org.Name = request.Name.Trim();
        org.Description = request.Description?.Trim();
        org.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(id, userId, "OrganizationUpdated", "Organization", id, $"Updated organization {org.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, id, ct: ct);
        return await GetByIdAsync(userId, id, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var m = await GetMembershipAsync(userId, id, ct);
        if (m == null) throw new ForbiddenException("Not a member.");
        if (m.Role != OrganizationRole.Owner) throw new ForbiddenException("Only Owner can delete organization.");
        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org == null) throw new NotFoundException("Organization not found.");
        // Capture members BEFORE cascade delete removes their rows.
        var memberIds = await _db.OrganizationMembers.Where(x => x.OrganizationId == id).Select(x => x.UserId).ToListAsync(ct);
        _db.Organizations.Remove(org);
        await _db.SaveChangesAsync(ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, id, memberIds, ct);
    }

    public async Task<List<OrganizationMemberDto>> GetMembersAsync(Guid userId, Guid orgId, CancellationToken ct = default)
    {
        await EnsureIsMemberAsync(userId, orgId, ct);
        var members = await _db.OrganizationMembers
            .Where(m => m.OrganizationId == orgId)
            .Include(m => m.User)
            .ToListAsync(ct);
        return members.Select(m => new OrganizationMemberDto(m.UserId, m.User.Email, m.User.FullName, m.Role, m.JoinedAt)).ToList();
    }

    public async Task<OrganizationMemberDto> AddMemberAsync(Guid userId, Guid orgId, AddMemberRequest request, CancellationToken ct = default)
    {
        await EnsureCanManageAsync(userId, orgId, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user == null) throw new NotFoundException("User with this email not found.");
        var exists = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == user.Id, ct);
        if (exists) throw new ConflictException("User is already a member.");
        if (!Enum.TryParse<OrganizationRole>(request.Role, true, out var role))
            role = OrganizationRole.Member;

        // Only Owner can add Owner/Admin
        var requester = await GetMembershipAsync(userId, orgId, ct);
        if (requester!.Role != OrganizationRole.Owner && (role == OrganizationRole.Owner || role == OrganizationRole.Admin))
            throw new ForbiddenException("Only Owner can assign Owner/Admin roles.");

        var member = new OrganizationMember { OrganizationId = orgId, UserId = user.Id, Role = role };
        _db.OrganizationMembers.Add(member);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(orgId, userId, "MemberAdded", "OrganizationMember", user.Id, $"Added {user.Email} as {role}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, orgId, ct: ct);
        return new OrganizationMemberDto(user.Id, user.Email, user.FullName, role, member.JoinedAt);
    }

    public async Task<OrganizationMemberDto> UpdateMemberRoleAsync(Guid userId, Guid orgId, Guid memberUserId, UpdateMemberRoleRequest request, CancellationToken ct = default)
    {
        await EnsureCanManageAsync(userId, orgId, ct);
        if (!Enum.TryParse<OrganizationRole>(request.Role, true, out var role))
            throw new ConflictException("Invalid role.");
        var member = await _db.OrganizationMembers.Include(m => m.User)
            .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == memberUserId, ct);
        if (member == null) throw new NotFoundException("Member not found.");
        var requester = await GetMembershipAsync(userId, orgId, ct);
        if (requester!.Role != OrganizationRole.Owner && (role == OrganizationRole.Owner || member.Role == OrganizationRole.Owner))
            throw new ForbiddenException("Only Owner can manage Owner role.");
        member.Role = role;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(orgId, userId, "MemberRoleChanged", "OrganizationMember", memberUserId, $"Changed role to {role}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, orgId, ct: ct);
        return new OrganizationMemberDto(member.UserId, member.User.Email, member.User.FullName, member.Role, member.JoinedAt);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid orgId, Guid memberUserId, CancellationToken ct = default)
    {
        await EnsureCanManageAsync(userId, orgId, ct);
        var member = await _db.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == memberUserId, ct);
        if (member == null) throw new NotFoundException("Member not found.");
        if (member.Role == OrganizationRole.Owner)
        {
            var ownerCount = await _db.OrganizationMembers.CountAsync(m => m.OrganizationId == orgId && m.Role == OrganizationRole.Owner, ct);
            if (ownerCount <= 1) throw new ConflictException("Cannot remove the last Owner.");
        }
        _db.OrganizationMembers.Remove(member);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(orgId, userId, "MemberRemoved", "OrganizationMember", memberUserId, "Removed member", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, orgId, new[] { memberUserId }, ct);
    }
}
