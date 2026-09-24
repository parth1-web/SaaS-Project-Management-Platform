using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SaaSProjectManager.Domain.Enums;
using SaaSProjectManager.Infrastructure.Persistence;

namespace SaaSProjectManager.Infrastructure.Background;

public class TokenCleanupService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<TokenCleanupService> _logger;
    public TokenCleanupService(IServiceProvider sp, ILogger<TokenCleanupService> logger)
    {
        _sp = sp; _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var cutoff = DateTime.UtcNow.AddDays(-30);
                var expired = await db.RefreshTokens
                    .Where(t => t.ExpiresAt < cutoff || (t.RevokedAt.HasValue && t.RevokedAt < cutoff))
                    .ToListAsync(stoppingToken);
                if (expired.Count > 0)
                {
                    db.RefreshTokens.RemoveRange(expired);
                    await db.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("Cleaned {Count} expired refresh tokens", expired.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token cleanup failed");
            }
            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }
}

public class DeadlineReminderService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<DeadlineReminderService> _logger;
    public DeadlineReminderService(IServiceProvider sp, ILogger<DeadlineReminderService> logger)
    {
        _sp = sp; _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait a bit on startup
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var tomorrow = DateTime.UtcNow.AddHours(24);
                var dueSoon = await db.Tasks
                    .Where(t => t.DueDate.HasValue && t.DueDate <= tomorrow && t.DueDate > DateTime.UtcNow
                        && t.Status != Domain.Enums.TaskStatus.Completed && t.AssignedTo.HasValue)
                    .ToListAsync(stoppingToken);

                foreach (var task in dueSoon)
                {
                    var already = await db.Notifications.AnyAsync(n =>
                        n.UserId == task.AssignedTo!.Value &&
                        n.RelatedEntityId == task.Id &&
                        n.Type == NotificationType.DeadlineReminder &&
                        n.CreatedAt > DateTime.UtcNow.AddHours(-20), stoppingToken);
                    if (!already)
                    {
                        db.Notifications.Add(new Domain.Entities.Notification
                        {
                            UserId = task.AssignedTo!.Value,
                            Type = NotificationType.DeadlineReminder,
                            Title = "Deadline approaching",
                            Message = $"'{task.Title}' is due on {task.DueDate:yyyy-MM-dd HH:mm}",
                            RelatedEntityId = task.Id
                        });
                    }
                }
                if (dueSoon.Count > 0) await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Deadline reminder job failed");
            }
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
