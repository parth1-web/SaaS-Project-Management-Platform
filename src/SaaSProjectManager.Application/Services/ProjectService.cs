using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Entities;
using SaaSProjectManager.Domain.Enums;

namespace SaaSProjectManager.Application.Services;

public class ProjectService : IProjectService
{
    private readonly IApplicationDbContext _db;
    private readonly IActivityLogService _activity;
    private readonly ICacheService _cache;

    public ProjectService(IApplicationDbContext db, IActivityLogService activity, ICacheService cache)
    {
        _db = db;
        _activity = activity;
        _cache = cache;
    }

    private async Task<OrganizationMember?> GetOrgMembership(Guid userId, Guid orgId, CancellationToken ct)
        => await _db.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId, ct);

    private async Task EnsureOrgAccess(Guid userId, Guid orgId, CancellationToken ct)
    {
        var m = await GetOrgMembership(userId, orgId, ct);
        if (m == null) throw new ForbiddenException("Not a member of this organization.");
    }

    private async Task EnsureProjectAccess(Guid userId, Project project, CancellationToken ct)
    {
        var orgMember = await GetOrgMembership(userId, project.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("Not a member of this organization.");
        // Member role can only access projects they belong to
        if (orgMember.Role == OrganizationRole.Member)
        {
            var isProjectMember = await _db.ProjectMembers.AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId, ct);
            if (!isProjectMember) throw new ForbiddenException("Not a member of this project.");
        }
    }

    private async Task<ProjectDto> MapAsync(Project p, CancellationToken ct)
    {
        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == p.OrganizationId, ct);
        var taskCount = await _db.Tasks.CountAsync(t => t.ProjectId == p.Id, ct);
        var completed = await _db.Tasks.CountAsync(t => t.ProjectId == p.Id && t.Status == Domain.Enums.TaskStatus.Completed, ct);
        var memberCount = await _db.ProjectMembers.CountAsync(m => m.ProjectId == p.Id, ct);
        return new ProjectDto(p.Id, p.OrganizationId, org?.Name ?? "", p.Name, p.Description, p.Status, p.StartDate, p.EndDate, taskCount, completed, memberCount, p.CreatedAt);
    }

    public async Task<ProjectDto> CreateAsync(Guid userId, CreateProjectRequest request, CancellationToken ct = default)
    {
        var orgMember = await GetOrgMembership(userId, request.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("Not a member of this organization.");
        if (orgMember.Role == OrganizationRole.Member)
            throw new ForbiddenException("Members cannot create projects.");

        var project = new Project
        {
            OrganizationId = request.OrganizationId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Status = request.Status,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedBy = userId
        };
        _db.Projects.Add(project);
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = userId });
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "ProjectCreated", "Project", project.Id, $"Created project {project.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, project.OrganizationId, ct: ct);
        return await MapAsync(project, ct);
    }

    public async Task<PagedResult<ProjectDto>> ListAsync(Guid userId, Guid? organizationId = null, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var userOrgIds = await _db.OrganizationMembers.Where(m => m.UserId == userId).Select(m => m.OrganizationId).ToListAsync(ct);
        var query = _db.Projects.Where(p => userOrgIds.Contains(p.OrganizationId));
        if (organizationId.HasValue)
        {
            if (!userOrgIds.Contains(organizationId.Value)) throw new ForbiddenException("Not a member of this organization.");
            query = query.Where(p => p.OrganizationId == organizationId.Value);
        }
        var total = await query.CountAsync(ct);
        var projects = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var items = new List<ProjectDto>();
        foreach (var p in projects) items.Add(await MapAsync(p, ct));
        return new PagedResult<ProjectDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<ProjectDto> GetByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        await EnsureProjectAccess(userId, p, ct);
        return await MapAsync(p, ct);
    }

    public async Task<ProjectDto> UpdateAsync(Guid userId, Guid id, UpdateProjectRequest request, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        var orgMember = await GetOrgMembership(userId, p.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("No access.");
        if (orgMember.Role == OrganizationRole.Member) throw new ForbiddenException("Members cannot update projects.");
        p.Name = request.Name.Trim();
        p.Description = request.Description?.Trim();
        p.Status = request.Status;
        p.StartDate = request.StartDate;
        p.EndDate = request.EndDate;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(p.OrganizationId, userId, "ProjectUpdated", "Project", p.Id, $"Updated project {p.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, p.OrganizationId, ct: ct);
        return await MapAsync(p, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        var orgMember = await GetOrgMembership(userId, p.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("No access.");
        if (orgMember.Role == OrganizationRole.Member) throw new ForbiddenException("Members cannot delete projects.");
        _db.Projects.Remove(p);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(p.OrganizationId, userId, "ProjectDeleted", "Project", p.Id, $"Deleted project {p.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, p.OrganizationId, ct: ct);
    }

    public async Task<List<ProjectMemberDto>> GetMembersAsync(Guid userId, Guid projectId, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == projectId, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        await EnsureProjectAccess(userId, p, ct);
        var members = await _db.ProjectMembers.Where(m => m.ProjectId == projectId).Include(m => m.User).ToListAsync(ct);
        return members.Select(m => new ProjectMemberDto(m.UserId, m.User.Email, m.User.FullName, m.JoinedAt)).ToList();
    }

    public async Task<ProjectMemberDto> AddMemberAsync(Guid userId, Guid projectId, AddProjectMemberRequest request, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == projectId, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        var orgMember = await GetOrgMembership(userId, p.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("No access.");
        if (orgMember.Role == OrganizationRole.Member) throw new ForbiddenException("Members cannot add project members.");

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user == null) throw new NotFoundException("User not found.");
        var orgCheck = await GetOrgMembership(user.Id, p.OrganizationId, ct);
        if (orgCheck == null) throw new ForbiddenException("User is not in the organization. Add them to organization first.");
        var exists = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == user.Id, ct);
        if (exists) throw new ConflictException("Already a project member.");

        var pm = new ProjectMember { ProjectId = projectId, UserId = user.Id };
        _db.ProjectMembers.Add(pm);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(p.OrganizationId, userId, "ProjectMemberAdded", "Project", projectId, $"Added {user.Email} to project {p.Name}", ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, p.OrganizationId, new[] { user.Id }, ct);
        return new ProjectMemberDto(user.Id, user.Email, user.FullName, pm.JoinedAt);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid projectId, Guid memberUserId, CancellationToken ct = default)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == projectId, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        var orgMember = await GetOrgMembership(userId, p.OrganizationId, ct);
        if (orgMember == null) throw new ForbiddenException("No access.");
        if (orgMember.Role == OrganizationRole.Member) throw new ForbiddenException("Members cannot remove project members.");
        var pm = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == memberUserId, ct);
        if (pm == null) throw new NotFoundException("Project member not found.");
        _db.ProjectMembers.Remove(pm);
        await _db.SaveChangesAsync(ct);
        await Common.DashboardCache.EvictForOrganizationAsync(_db, _cache, p.OrganizationId, new[] { memberUserId }, ct);
    }
}
