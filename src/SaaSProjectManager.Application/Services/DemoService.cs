using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Domain.Enums;
using TaskStatus = SaaSProjectManager.Domain.Enums.TaskStatus;

namespace SaaSProjectManager.Application.Services;

public class DemoService : IDemoService
{
    private const string DemoOrgName = "Demo Workspace";

    private readonly IOrganizationService _orgs;
    private readonly IProjectService _projects;
    private readonly ITaskService _tasks;
    private readonly ICommentService _comments;
    private readonly INotificationService _notifications;

    public DemoService(
        IOrganizationService orgs,
        IProjectService projects,
        ITaskService tasks,
        ICommentService comments,
        INotificationService notifications)
    {
        _orgs = orgs;
        _projects = projects;
        _tasks = tasks;
        _comments = comments;
        _notifications = notifications;
    }

    public async Task<DemoSeedResponse> SeedAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await _orgs.ListAsync(userId, 1, 100, ct);
        var demoOrg = existing.Items.FirstOrDefault(o =>
            o.Name.Equals(DemoOrgName, StringComparison.OrdinalIgnoreCase));
        if (demoOrg != null)
            return new DemoSeedResponse(demoOrg.Id, false);

        var org = await _orgs.CreateAsync(userId,
            new CreateOrganizationRequest(DemoOrgName, "Sample workspace — explore, then make it yours."), ct);

        var web = await _projects.CreateAsync(userId, new CreateProjectRequest(
            org.Id, "Website Redesign", "Marketing site refresh",
            ProjectStatus.Active, DateTime.UtcNow.AddDays(-14), DateTime.UtcNow.AddDays(30)), ct);
        var api = await _projects.CreateAsync(userId, new CreateProjectRequest(
            org.Id, "API Hardening", "Auth, rate limits, audit logs",
            ProjectStatus.Active, DateTime.UtcNow.AddDays(-7), DateTime.UtcNow.AddDays(21)), ct);

        var now = DateTime.UtcNow;
        var t1 = await _tasks.CreateAsync(userId, web.Id, new CreateTaskRequest(
            "Design homepage hero", "New bluish hero section", TaskPriority.High, now.AddDays(5), userId), ct);
        var t2 = await _tasks.CreateAsync(userId, web.Id, new CreateTaskRequest(
            "Migrate to new theme", "Apply workspace blue theme", TaskPriority.Urgent, now.AddDays(2), userId), ct);
        var t3 = await _tasks.CreateAsync(userId, web.Id, new CreateTaskRequest(
            "Write landing copy", "Hero + features copy", TaskPriority.Medium, now.AddDays(7), userId), ct);
        var t4 = await _tasks.CreateAsync(userId, web.Id, new CreateTaskRequest(
            "Setup analytics", "Page views + funnels", TaskPriority.Low, now.AddDays(-2), userId), ct);
        var t5 = await _tasks.CreateAsync(userId, api.Id, new CreateTaskRequest(
            "JWT refresh rotation", "Rotate refresh tokens on use", TaskPriority.Urgent, now.AddDays(1), userId), ct);
        await _tasks.CreateAsync(userId, api.Id, new CreateTaskRequest(
            "Rate limiting", "Fixed window per IP", TaskPriority.High, now.AddDays(6), userId), ct);
        var t7 = await _tasks.CreateAsync(userId, api.Id, new CreateTaskRequest(
            "Audit log export", "CSV export for admins", TaskPriority.Medium, now.AddDays(9), userId), ct);
        var t8 = await _tasks.CreateAsync(userId, api.Id, new CreateTaskRequest(
            "Password policy", "Min length + complexity", TaskPriority.Medium, now.AddDays(-5), userId), ct);

        await _tasks.UpdateStatusAsync(userId, t2.Id, new UpdateTaskStatusRequest(TaskStatus.InProgress), ct);
        await _tasks.UpdateStatusAsync(userId, t3.Id, new UpdateTaskStatusRequest(TaskStatus.Review), ct);
        await _tasks.UpdateStatusAsync(userId, t4.Id, new UpdateTaskStatusRequest(TaskStatus.Completed), ct);
        await _tasks.UpdateStatusAsync(userId, t5.Id, new UpdateTaskStatusRequest(TaskStatus.InProgress), ct);
        await _tasks.UpdateStatusAsync(userId, t7.Id, new UpdateTaskStatusRequest(TaskStatus.Review), ct);
        await _tasks.UpdateStatusAsync(userId, t8.Id, new UpdateTaskStatusRequest(TaskStatus.Completed), ct);

        await _comments.CreateAsync(userId, t1.Id, new CreateCommentRequest("Hero design assigned, due this week."), ct);
        await _comments.CreateAsync(userId, t5.Id, new CreateCommentRequest("Rotation working locally, needs review."), ct);

        await _notifications.CreateAsync(userId, NotificationType.ProjectCreated,
            "Welcome to your demo workspace",
            "Explore projects, move tasks on the board, then invite your team.", web.Id, ct);

        return new DemoSeedResponse(org.Id, true);
    }
}
