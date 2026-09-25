using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SaaSProjectManager.Domain.Entities;
using SaaSProjectManager.Domain.Enums;
using SaaSProjectManager.Infrastructure.Persistence;

namespace SaaSProjectManager.Infrastructure.Persistence;

/// <summary>
/// Development-only demo data seeder. Idempotent: does nothing when users already exist.
/// Seeds: demo users, 2 organizations, memberships, 3 projects, 12 tasks,
/// comments, notifications and activity logs so the UI is alive on first run.
/// </summary>
public static class DevDataSeeder
{
    public const string DemoEmail = "demo@saas.local";
    public const string DemoPassword = "Demo123!";

    public static async Task MigrateAndSeedAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DevDataSeeder");

        // Always migrate real databases: production databases start empty (e.g.
        // fresh Render PostgreSQL), and free tiers have no shell for manual
        // `dotnet ef` runs. Skipped for non-relational providers (InMemory tests).
        if (db.Database.IsRelational())
            await db.Database.MigrateAsync(ct);

        // Demo data is development-only. Never seed the publicly-known demo
        // credentials into a production database.
        if (!env.IsDevelopment()) return;

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        // Always ensure the demo account exists (login: demo@saas.local / Demo123!).
        var demo = await db.Users.FirstOrDefaultAsync(u => u.Email == DemoEmail, ct);
        if (demo == null)
        {
            demo = new User { FirstName = "Demo", LastName = "User", Email = DemoEmail, IsActive = true };
            demo.PasswordHash = hasher.HashPassword(demo, DemoPassword);
            db.Users.Add(demo);
            await db.SaveChangesAsync(ct);
        }

        // Seed the demo workspace once. Existing real accounts are added as
        // members so they see the demo organizations/tasks immediately.
        if (await db.Organizations.AnyAsync(ct)) return;

        async Task<User> EnsureLocalUser(string first, string last, string email)
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
            if (existing != null) return existing;
            var u = new User { FirstName = first, LastName = last, Email = email, IsActive = true };
            u.PasswordHash = hasher.HashPassword(u, DemoPassword);
            db.Users.Add(u);
            await db.SaveChangesAsync(ct);
            return u;
        }

        var alex = await EnsureLocalUser("Alex", "Smith", "alex@saas.local");
        var sarah = await EnsureLocalUser("Sarah", "Jones", "sarah@saas.local");

        var acme = new Organization { Name = "Acme Technologies", Slug = "acme-technologies", Description = "Flagship demo workspace" };
        var labs = new Organization { Name = "Startup Labs", Slug = "startup-labs", Description = "Experiments and side projects" };
        db.Organizations.AddRange(acme, labs);
        await db.SaveChangesAsync(ct);

        db.OrganizationMembers.AddRange(
            new OrganizationMember { OrganizationId = acme.Id, UserId = demo.Id, Role = OrganizationRole.Owner },
            new OrganizationMember { OrganizationId = acme.Id, UserId = alex.Id, Role = OrganizationRole.Manager },
            new OrganizationMember { OrganizationId = acme.Id, UserId = sarah.Id, Role = OrganizationRole.Member },
            new OrganizationMember { OrganizationId = labs.Id, UserId = demo.Id, Role = OrganizationRole.Owner },
            new OrganizationMember { OrganizationId = labs.Id, UserId = alex.Id, Role = OrganizationRole.Member });
        // Attach every pre-existing real account to the demo org so the
        // workspace is populated the moment they log in.
        var existingIds = await db.Users
            .Where(u => u.Email != DemoEmail && u.Email != "alex@saas.local" && u.Email != "sarah@saas.local")
            .Select(u => u.Id).ToListAsync(ct);
        foreach (var uid in existingIds)
            db.OrganizationMembers.Add(new OrganizationMember { OrganizationId = acme.Id, UserId = uid, Role = OrganizationRole.Manager });
        await db.SaveChangesAsync(ct);

        var web = new Project
        {
            OrganizationId = acme.Id, Name = "Website Redesign", Description = "Marketing site refresh",
            Status = ProjectStatus.Active, StartDate = DateTime.UtcNow.AddDays(-14),
            EndDate = DateTime.UtcNow.AddDays(30), CreatedBy = demo.Id
        };
        var api = new Project
        {
            OrganizationId = acme.Id, Name = "API Hardening", Description = "Auth, rate limits, audit logs",
            Status = ProjectStatus.Active, StartDate = DateTime.UtcNow.AddDays(-7),
            EndDate = DateTime.UtcNow.AddDays(21), CreatedBy = demo.Id
        };
        var mobile = new Project
        {
            OrganizationId = labs.Id, Name = "Mobile Prototype", Description = "Click-through prototype",
            Status = ProjectStatus.Planning, StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(60), CreatedBy = demo.Id
        };
        db.Projects.AddRange(web, api, mobile);
        await db.SaveChangesAsync(ct);

        foreach (var p in new[] { web, api, mobile })
        {
            db.ProjectMembers.Add(new ProjectMember { ProjectId = p.Id, UserId = demo.Id });
        }
        db.ProjectMembers.Add(new ProjectMember { ProjectId = web.Id, UserId = alex.Id });
        db.ProjectMembers.Add(new ProjectMember { ProjectId = api.Id, UserId = sarah.Id });
        await db.SaveChangesAsync(ct);

        var now = DateTime.UtcNow;
        var tasks = new List<TaskItem>
        {
            new() { ProjectId = web.Id, Title = "Design homepage hero", Description = "New bluish hero section", Status = Domain.Enums.TaskStatus.Todo, Priority = TaskPriority.High, DueDate = now.AddDays(5), CreatedBy = demo.Id, AssignedTo = alex.Id },
            new() { ProjectId = web.Id, Title = "Migrate to new theme", Description = "Apply workspace blue theme", Status = Domain.Enums.TaskStatus.InProgress, Priority = TaskPriority.Urgent, DueDate = now.AddDays(2), CreatedBy = demo.Id, AssignedTo = demo.Id },
            new() { ProjectId = web.Id, Title = "Write landing copy", Description = "Hero + features copy", Status = Domain.Enums.TaskStatus.Review, Priority = TaskPriority.Medium, DueDate = now.AddDays(7), CreatedBy = alex.Id, AssignedTo = sarah.Id },
            new() { ProjectId = web.Id, Title = "Setup analytics", Description = "Page views + funnels", Status = Domain.Enums.TaskStatus.Completed, Priority = TaskPriority.Low, DueDate = now.AddDays(-2), CreatedBy = demo.Id, AssignedTo = demo.Id },
            new() { ProjectId = api.Id, Title = "JWT refresh rotation", Description = "Rotate refresh tokens on use", Status = Domain.Enums.TaskStatus.InProgress, Priority = TaskPriority.Urgent, DueDate = now.AddDays(1), CreatedBy = demo.Id, AssignedTo = demo.Id },
            new() { ProjectId = api.Id, Title = "Rate limiting", Description = "Fixed window per IP", Status = Domain.Enums.TaskStatus.Todo, Priority = TaskPriority.High, DueDate = now.AddDays(6), CreatedBy = demo.Id, AssignedTo = sarah.Id },
            new() { ProjectId = api.Id, Title = "Audit log export", Description = "CSV export for admins", Status = Domain.Enums.TaskStatus.Review, Priority = TaskPriority.Medium, DueDate = now.AddDays(9), CreatedBy = sarah.Id, AssignedTo = alex.Id },
            new() { ProjectId = api.Id, Title = "Password policy", Description = "Min length + complexity", Status = Domain.Enums.TaskStatus.Completed, Priority = TaskPriority.Medium, DueDate = now.AddDays(-5), CreatedBy = demo.Id, AssignedTo = demo.Id },
            new() { ProjectId = mobile.Id, Title = "Onboarding flow mock", Description = "3-screen mock", Status = Domain.Enums.TaskStatus.Todo, Priority = TaskPriority.Medium, DueDate = now.AddDays(12), CreatedBy = demo.Id, AssignedTo = alex.Id },
            new() { ProjectId = mobile.Id, Title = "Push notification spikes", Description = "Evaluate providers", Status = Domain.Enums.TaskStatus.Todo, Priority = TaskPriority.Low, DueDate = now.AddDays(20), CreatedBy = alex.Id, AssignedTo = null },
            new() { ProjectId = web.Id, Title = "Fix mobile nav overlap", Description = "Header z-index fix", Status = Domain.Enums.TaskStatus.Completed, Priority = TaskPriority.High, DueDate = now.AddDays(-1), CreatedBy = sarah.Id, AssignedTo = sarah.Id },
            new() { ProjectId = api.Id, Title = "Overdue: token cleanup", Description = "Intentionally overdue demo task", Status = Domain.Enums.TaskStatus.Todo, Priority = TaskPriority.High, DueDate = now.AddDays(-3), CreatedBy = demo.Id, AssignedTo = demo.Id },
        };
        db.Tasks.AddRange(tasks);
        await db.SaveChangesAsync(ct);

        db.Comments.AddRange(
            new Comment { TaskId = tasks[1].Id, UserId = alex.Id, Content = "Theme looks great. Please keep the blue subtle." },
            new Comment { TaskId = tasks[4].Id, UserId = sarah.Id, Content = "Rotation working locally, needs review." },
            new Comment { TaskId = tasks[0].Id, UserId = demo.Id, Content = "Assigned hero design, due this week." });
        db.Notifications.AddRange(
            new Notification { UserId = demo.Id, Type = NotificationType.TaskAssigned, Title = "Task assigned", Message = "JWT refresh rotation assigned to you", IsRead = false, RelatedEntityId = tasks[4].Id },
            new Notification { UserId = alex.Id, Type = NotificationType.CommentAdded, Title = "New comment", Message = "Demo commented on Design homepage hero", IsRead = false, RelatedEntityId = tasks[0].Id },
            new Notification { UserId = demo.Id, Type = NotificationType.DeadlineReminder, Title = "Deadline approaching", Message = "Overdue: token cleanup is past due", IsRead = false, RelatedEntityId = tasks[11].Id });
        db.ActivityLogs.AddRange(
            new ActivityLog { OrganizationId = acme.Id, UserId = demo.Id, Action = "ProjectCreated", EntityType = "Project", EntityId = web.Id, Description = "Created project Website Redesign" },
            new ActivityLog { OrganizationId = acme.Id, UserId = alex.Id, Action = "TaskStatusChanged", EntityType = "Task", EntityId = tasks[1].Id, Description = "Moved Migrate to new theme to InProgress" },
            new ActivityLog { OrganizationId = acme.Id, UserId = sarah.Id, Action = "CommentAdded", EntityType = "Comment", EntityId = tasks[4].Id, Description = "Commented on JWT refresh rotation" });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Seeded demo data: 3 users, 2 orgs, 3 projects, {Count} tasks", tasks.Count);
    }
}
