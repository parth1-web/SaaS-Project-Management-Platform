using SaaSProjectManager.Domain.Enums;

namespace SaaSProjectManager.Application.DTOs;

public record NotificationDto(Guid Id, NotificationType Type, string Title, string Message, bool IsRead, Guid? RelatedEntityId, DateTime CreatedAt);
public record DashboardStatsDto(
    int TotalOrganizations, int TotalProjects, int TotalTasks,
    int CompletedTasks, int PendingTasks, int OverdueTasks,
    List<TasksByStatusDto> TasksByStatus,
    List<TasksByPriorityDto> TasksByPriority);
public record TasksByStatusDto(string Status, int Count);
public record TasksByPriorityDto(string Priority, int Count);
public record ActivityLogDto(Guid Id, Guid OrganizationId, Guid UserId, string UserName, string Action, string EntityType, Guid? EntityId, string? Description, DateTime CreatedAt);
public record AttachmentDto(Guid Id, Guid TaskId, string FileName, string ContentType, long Size, Guid UploadedBy, DateTime CreatedAt);
