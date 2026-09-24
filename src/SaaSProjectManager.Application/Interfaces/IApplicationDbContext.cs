using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Domain.Entities;

namespace SaaSProjectManager.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Organization> Organizations { get; }
    DbSet<OrganizationMember> OrganizationMembers { get; }
    DbSet<Project> Projects { get; }
    DbSet<ProjectMember> ProjectMembers { get; }
    DbSet<TaskItem> Tasks { get; }
    DbSet<Comment> Comments { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<Attachment> Attachments { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<Label> Labels { get; }
    DbSet<TaskLabel> TaskLabels { get; }
    DbSet<Sprint> Sprints { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
