using SaaSProjectManager.Domain.Enums;
using TaskStatus = SaaSProjectManager.Domain.Enums.TaskStatus;

namespace SaaSProjectManager.Application.DTOs;

public record CreateTaskRequest(string Title, string? Description, TaskPriority Priority, DateTime? DueDate, Guid? AssignedTo);
public record UpdateTaskRequest(string Title, string? Description, TaskPriority Priority, DateTime? DueDate, Guid? AssignedTo, TaskStatus Status);
public record UpdateTaskStatusRequest(TaskStatus Status);
public record AssignTaskRequest(Guid? AssignedTo);
public record TaskDto(
    Guid Id, Guid ProjectId, string ProjectName,
    string Title, string? Description,
    TaskStatus Status, TaskPriority Priority,
    DateTime? DueDate,
    Guid CreatedBy, string? CreatedByName,
    Guid? AssignedTo, string? AssigneeName,
    int CommentCount, int AttachmentCount,
    DateTime CreatedAt, DateTime UpdatedAt);

public class TaskFilterParams
{
    public TaskStatus? Status { get; set; }
    public TaskPriority? Priority { get; set; }
    public Guid? Assignee { get; set; }
    public string? Search { get; set; }
    public DateTime? DueBefore { get; set; }
    public DateTime? DueAfter { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
