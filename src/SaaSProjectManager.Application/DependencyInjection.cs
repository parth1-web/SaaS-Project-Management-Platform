using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Application.Services;
using SaaSProjectManager.Domain.Entities;

namespace SaaSProjectManager.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ICommentService, CommentService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IActivityLogService, ActivityLogService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAttachmentService, AttachmentService>();
        services.AddScoped<IDemoService, DemoService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        return services;
    }
}
