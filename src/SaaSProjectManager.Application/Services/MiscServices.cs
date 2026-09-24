using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Entities;

namespace SaaSProjectManager.Application.Services;

public class CommentService : ICommentService
{
    private readonly IApplicationDbContext _db;
    private readonly IActivityLogService _activity;
    private readonly INotificationService _notifications;

    public CommentService(IApplicationDbContext db, IActivityLogService activity, INotificationService notifications)
    {
        _db = db;
        _activity = activity;
        _notifications = notifications;
    }

    private async Task EnsureTaskAccess(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task == null) throw new NotFoundException("Task not found.");
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == task.ProjectId, ct);
        if (project == null) throw new NotFoundException("Project not found.");
        var member = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == project.OrganizationId && m.UserId == userId, ct);
        if (!member) throw new ForbiddenException("No access to this task.");
    }

    public async Task<CommentDto> CreateAsync(Guid userId, Guid taskId, CreateCommentRequest request, CancellationToken ct = default)
    {
        await EnsureTaskAccess(userId, taskId, ct);
        var task = await _db.Tasks.FirstAsync(t => t.Id == taskId, ct);
        var project = await _db.Projects.FirstAsync(p => p.Id == task.ProjectId, ct);
        var comment = new Comment { TaskId = taskId, UserId = userId, Content = request.Content.Trim() };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(ct);
        var user = await _db.Users.FirstAsync(u => u.Id == userId, ct);
        await _activity.LogAsync(project.OrganizationId, userId, "CommentAdded", "Comment", comment.Id, $"Comment on {task.Title}", ct);
        if (task.AssignedTo.HasValue && task.AssignedTo != userId)
            await _notifications.CreateAsync(task.AssignedTo.Value, Domain.Enums.NotificationType.CommentAdded, "New comment", $"{user.FullName} commented on '{task.Title}'", task.Id, ct);
        return new CommentDto(comment.Id, comment.TaskId, comment.UserId, user.FullName, comment.Content, comment.CreatedAt, comment.UpdatedAt);
    }

    public async Task<PagedResult<CommentDto>> ListAsync(Guid userId, Guid taskId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        await EnsureTaskAccess(userId, taskId, ct);
        var query = _db.Comments.Where(c => c.TaskId == taskId).Include(c => c.User);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<CommentDto>
        {
            Items = items.Select(c => new CommentDto(c.Id, c.TaskId, c.UserId, c.User.FullName, c.Content, c.CreatedAt, c.UpdatedAt)).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
    }

    public async Task<CommentDto> UpdateAsync(Guid userId, Guid commentId, UpdateCommentRequest request, CancellationToken ct = default)
    {
        var c = await _db.Comments.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == commentId, ct);
        if (c == null) throw new NotFoundException("Comment not found.");
        if (c.UserId != userId) throw new ForbiddenException("You can only edit your own comments.");
        c.Content = request.Content.Trim();
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return new CommentDto(c.Id, c.TaskId, c.UserId, c.User.FullName, c.Content, c.CreatedAt, c.UpdatedAt);
    }

    public async Task DeleteAsync(Guid userId, Guid commentId, CancellationToken ct = default)
    {
        var c = await _db.Comments.FirstOrDefaultAsync(x => x.Id == commentId, ct);
        if (c == null) throw new NotFoundException("Comment not found.");
        if (c.UserId != userId)
        {
            // Allow org admins to delete? check org role
            var task = await _db.Tasks.FirstAsync(t => t.Id == c.TaskId, ct);
            var project = await _db.Projects.FirstAsync(p => p.Id == task.ProjectId, ct);
            var m = await _db.OrganizationMembers.FirstOrDefaultAsync(x => x.OrganizationId == project.OrganizationId && x.UserId == userId, ct);
            if (m == null || (m.Role != Domain.Enums.OrganizationRole.Owner && m.Role != Domain.Enums.OrganizationRole.Admin))
                throw new ForbiddenException("Cannot delete others' comments.");
        }
        _db.Comments.Remove(c);
        await _db.SaveChangesAsync(ct);
    }
}

public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _db;
    public NotificationService(IApplicationDbContext db) { _db = db; }

    public async Task CreateAsync(Guid userId, Domain.Enums.NotificationType type, string title, string message, Guid? relatedId = null, CancellationToken ct = default)
    {
        _db.Notifications.Add(new Notification { UserId = userId, Type = type, Title = title, Message = message, RelatedEntityId = relatedId });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<NotificationDto>> ListAsync(Guid userId, int page = 1, int pageSize = 20, bool unreadOnly = false, CancellationToken ct = default)
    {
        var q = _db.Notifications.Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(n => n.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<NotificationDto>
        {
            Items = items.Select(n => new NotificationDto(n.Id, n.Type, n.Title, n.Message, n.IsRead, n.RelatedEntityId, n.CreatedAt)).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
        => await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task MarkAsReadAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (n == null) throw new NotFoundException("Notification not found.");
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default)
    {
        var items = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        foreach (var n in items) n.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }
}

public class ActivityLogService : IActivityLogService
{
    private readonly IApplicationDbContext _db;
    public ActivityLogService(IApplicationDbContext db) { _db = db; }

    public async Task LogAsync(Guid orgId, Guid userId, string action, string entityType, Guid? entityId, string? description, CancellationToken ct = default)
    {
        try
        {
            _db.ActivityLogs.Add(new ActivityLog
            {
                OrganizationId = orgId, UserId = userId, Action = action,
                EntityType = entityType, EntityId = entityId, Description = description
            });
            await _db.SaveChangesAsync(ct);
        }
        catch { /* logging must not break main flow */ }
    }

    public async Task<PagedResult<ActivityLogDto>> ListAsync(Guid userId, Guid orgId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var isMember = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == userId, ct);
        if (!isMember) throw new ForbiddenException("No access.");
        var q = _db.ActivityLogs.Where(a => a.OrganizationId == orgId).Include(a => a.User);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<ActivityLogDto>
        {
            Items = items.Select(a => new ActivityLogDto(a.Id, a.OrganizationId, a.UserId, a.User?.FullName ?? "System", a.Action, a.EntityType, a.EntityId, a.Description, a.CreatedAt)).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
    }
}

public class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    public DashboardService(IApplicationDbContext db, ICacheService cache) { _db = db; _cache = cache; }

    public async Task<DashboardStatsDto> GetStatsAsync(Guid userId, Guid? organizationId = null, CancellationToken ct = default)
    {
        var cacheKey = $"dashboard:{userId}:{organizationId}";
        var cached = await _cache.GetAsync<DashboardStatsDto>(cacheKey, ct);
        if (cached != null) return cached;

        var orgIds = await _db.OrganizationMembers.Where(m => m.UserId == userId).Select(m => m.OrganizationId).ToListAsync(ct);
        if (organizationId.HasValue)
        {
            if (!orgIds.Contains(organizationId.Value)) throw new ForbiddenException("No access.");
            orgIds = new List<Guid> { organizationId.Value };
        }
        var projectIds = await _db.Projects.Where(p => orgIds.Contains(p.OrganizationId)).Select(p => p.Id).ToListAsync(ct);
        var tasks = await _db.Tasks.Where(t => projectIds.Contains(t.ProjectId)).ToListAsync(ct);

        var totalTasks = tasks.Count;
        var completed = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Completed);
        var pending = tasks.Count(t => t.Status != Domain.Enums.TaskStatus.Completed);
        var overdue = tasks.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != Domain.Enums.TaskStatus.Completed);

        var byStatus = Enum.GetValues<Domain.Enums.TaskStatus>()
            .Select(s => new TasksByStatusDto(s.ToString(), tasks.Count(t => t.Status == s))).ToList();
        var byPriority = Enum.GetValues<Domain.Enums.TaskPriority>()
            .Select(p => new TasksByPriorityDto(p.ToString(), tasks.Count(t => t.Priority == p))).ToList();

        var dto = new DashboardStatsDto(orgIds.Count, projectIds.Count, totalTasks, completed, pending, overdue, byStatus, byPriority);
        await _cache.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(2), ct);
        return dto;
    }
}
