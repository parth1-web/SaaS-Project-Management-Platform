using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Entities;
using TaskStatus = SaaSProjectManager.Domain.Enums.TaskStatus;

namespace SaaSProjectManager.Application.Services;

public class TaskService : ITaskService
{
    private readonly IApplicationDbContext _db;
    private readonly IActivityLogService _activity;
    private readonly INotificationService _notifications;

    public TaskService(IApplicationDbContext db, IActivityLogService activity, INotificationService notifications)
    {
        _db = db;
        _activity = activity;
        _notifications = notifications;
    }

    private async Task<Project> GetProjectOrThrow(Guid projectId, CancellationToken ct)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == projectId, ct);
        if (p == null) throw new NotFoundException("Project not found.");
        return p;
    }

    private async Task EnsureProjectAccess(Guid userId, Guid projectId, CancellationToken ct)
    {
        var p = await GetProjectOrThrow(projectId, ct);
        var orgMember = await _db.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == p.OrganizationId && m.UserId == userId, ct);
        if (orgMember == null) throw new ForbiddenException("No access to this project.");
    }

    private async Task<TaskDto> MapAsync(TaskItem t, CancellationToken ct)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == t.ProjectId, ct);
        string? creatorName = null, assigneeName = null;
        var creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == t.CreatedBy, ct);
        if (creator != null) creatorName = creator.FullName;
        if (t.AssignedTo.HasValue)
        {
            var a = await _db.Users.FirstOrDefaultAsync(u => u.Id == t.AssignedTo.Value, ct);
            if (a != null) assigneeName = a.FullName;
        }
        var commentCount = await _db.Comments.CountAsync(c => c.TaskId == t.Id, ct);
        var attCount = await _db.Attachments.CountAsync(a => a.TaskId == t.Id, ct);
        return new TaskDto(t.Id, t.ProjectId, project?.Name ?? "", t.Title, t.Description, t.Status, t.Priority, t.DueDate, t.CreatedBy, creatorName, t.AssignedTo, assigneeName, commentCount, attCount, t.CreatedAt, t.UpdatedAt);
    }

    public async Task<TaskDto> CreateAsync(Guid userId, Guid projectId, CreateTaskRequest request, CancellationToken ct = default)
    {
        await EnsureProjectAccess(userId, projectId, ct);
        var project = await GetProjectOrThrow(projectId, ct);

        if (request.AssignedTo.HasValue)
        {
            var assigneeOrg = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == project.OrganizationId && m.UserId == request.AssignedTo.Value, ct);
            if (!assigneeOrg) throw new ForbiddenException("Assignee must be in the organization.");
        }

        var task = new TaskItem
        {
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = request.Priority,
            DueDate = request.DueDate,
            CreatedBy = userId,
            AssignedTo = request.AssignedTo,
            Status = TaskStatus.Todo
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "TaskCreated", "Task", task.Id, $"Created task {task.Title}", ct);
        if (task.AssignedTo.HasValue && task.AssignedTo != userId)
            await _notifications.CreateAsync(task.AssignedTo.Value, Domain.Enums.NotificationType.TaskAssigned, "Task assigned", $"You were assigned to '{task.Title}'", task.Id, ct);
        return await MapAsync(task, ct);
    }

    public async Task<PagedResult<TaskDto>> ListAsync(Guid userId, Guid projectId, TaskFilterParams filter, CancellationToken ct = default)
    {
        await EnsureProjectAccess(userId, projectId, ct);
        var query = _db.Tasks.Where(t => t.ProjectId == projectId).AsQueryable();
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status.Value);
        if (filter.Priority.HasValue) query = query.Where(t => t.Priority == filter.Priority.Value);
        if (filter.Assignee.HasValue) query = query.Where(t => t.AssignedTo == filter.Assignee.Value);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || (t.Description != null && t.Description.ToLower().Contains(s)));
        }
        if (filter.DueBefore.HasValue) query = query.Where(t => t.DueDate <= filter.DueBefore.Value);
        if (filter.DueAfter.HasValue) query = query.Where(t => t.DueDate >= filter.DueAfter.Value);

        var total = await query.CountAsync(ct);
        var tasks = await query.OrderByDescending(t => t.CreatedAt).Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(ct);
        var items = new List<TaskDto>();
        foreach (var t in tasks) items.Add(await MapAsync(t, ct));
        return new PagedResult<TaskDto> { Items = items, Page = filter.Page, PageSize = filter.PageSize, TotalCount = total };
    }

    public async Task<PagedResult<TaskDto>> SearchAsync(Guid userId, string? search, string? status, string? priority, Guid? assignee, Guid? projectId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var userOrgIds = await _db.OrganizationMembers.Where(m => m.UserId == userId).Select(m => m.OrganizationId).ToListAsync(ct);
        var projectIds = await _db.Projects.Where(p => userOrgIds.Contains(p.OrganizationId)).Select(p => p.Id).ToListAsync(ct);
        var query = _db.Tasks.Where(t => projectIds.Contains(t.ProjectId)).AsQueryable();
        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || (t.Description != null && t.Description.ToLower().Contains(s)));
        }
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TaskStatus>(status, true, out var st))
            query = query.Where(t => t.Status == st);
        if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<Domain.Enums.TaskPriority>(priority, true, out var pr))
            query = query.Where(t => t.Priority == pr);
        if (assignee.HasValue) query = query.Where(t => t.AssignedTo == assignee.Value);

        var total = await query.CountAsync(ct);
        var tasks = await query.OrderByDescending(t => t.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var items = new List<TaskDto>();
        foreach (var t in tasks) items.Add(await MapAsync(t, ct));
        return new PagedResult<TaskDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<TaskDto> GetByIdAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId, ct);
        if (t == null) throw new NotFoundException("Task not found.");
        await EnsureProjectAccess(userId, t.ProjectId, ct);
        return await MapAsync(t, ct);
    }

    public async Task<TaskDto> UpdateAsync(Guid userId, Guid taskId, UpdateTaskRequest request, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId, ct);
        if (t == null) throw new NotFoundException("Task not found.");
        await EnsureProjectAccess(userId, t.ProjectId, ct);
        var project = await GetProjectOrThrow(t.ProjectId, ct);
        t.Title = request.Title.Trim();
        t.Description = request.Description?.Trim();
        t.Priority = request.Priority;
        t.DueDate = request.DueDate;
        t.Status = request.Status;
        if (request.AssignedTo.HasValue)
        {
            var ok = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == project.OrganizationId && m.UserId == request.AssignedTo.Value, ct);
            if (!ok) throw new ForbiddenException("Assignee must be in organization.");
        }
        var prevAssignee = t.AssignedTo;
        t.AssignedTo = request.AssignedTo;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "TaskUpdated", "Task", t.Id, $"Updated task {t.Title}", ct);
        if (t.AssignedTo.HasValue && t.AssignedTo != prevAssignee && t.AssignedTo != userId)
            await _notifications.CreateAsync(t.AssignedTo.Value, Domain.Enums.NotificationType.TaskAssigned, "Task assigned", $"You were assigned to '{t.Title}'", t.Id, ct);
        return await MapAsync(t, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId, ct);
        if (t == null) throw new NotFoundException("Task not found.");
        await EnsureProjectAccess(userId, t.ProjectId, ct);
        var project = await GetProjectOrThrow(t.ProjectId, ct);
        _db.Tasks.Remove(t);
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "TaskDeleted", "Task", taskId, $"Deleted task {t.Title}", ct);
    }

    public async Task<TaskDto> UpdateStatusAsync(Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId, ct);
        if (t == null) throw new NotFoundException("Task not found.");
        await EnsureProjectAccess(userId, t.ProjectId, ct);
        var project = await GetProjectOrThrow(t.ProjectId, ct);
        t.Status = request.Status;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "TaskStatusChanged", "Task", t.Id, $"Status -> {request.Status}", ct);
        if (t.AssignedTo.HasValue && t.AssignedTo != userId)
            await _notifications.CreateAsync(t.AssignedTo.Value, Domain.Enums.NotificationType.TaskStatusChanged, "Task status changed", $"'{t.Title}' -> {request.Status}", t.Id, ct);
        return await MapAsync(t, ct);
    }

    public async Task<TaskDto> AssignAsync(Guid userId, Guid taskId, AssignTaskRequest request, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId, ct);
        if (t == null) throw new NotFoundException("Task not found.");
        await EnsureProjectAccess(userId, t.ProjectId, ct);
        var project = await GetProjectOrThrow(t.ProjectId, ct);
        if (request.AssignedTo.HasValue)
        {
            var ok = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == project.OrganizationId && m.UserId == request.AssignedTo.Value, ct);
            if (!ok) throw new ForbiddenException("Assignee must be in organization.");
        }
        t.AssignedTo = request.AssignedTo;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(project.OrganizationId, userId, "TaskAssigned", "Task", t.Id, "Task assignment changed", ct);
        if (t.AssignedTo.HasValue && t.AssignedTo != userId)
            await _notifications.CreateAsync(t.AssignedTo.Value, Domain.Enums.NotificationType.TaskAssigned, "Task assigned", $"You were assigned to '{t.Title}'", t.Id, ct);
        return await MapAsync(t, ct);
    }
}
