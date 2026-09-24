using SaaSProjectManager.Domain.Enums;

namespace SaaSProjectManager.Application.DTOs;

public record CreateProjectRequest(Guid OrganizationId, string Name, string? Description, ProjectStatus Status, DateTime? StartDate, DateTime? EndDate);
public record UpdateProjectRequest(string Name, string? Description, ProjectStatus Status, DateTime? StartDate, DateTime? EndDate);
public record ProjectDto(Guid Id, Guid OrganizationId, string OrganizationName, string Name, string? Description, ProjectStatus Status, DateTime? StartDate, DateTime? EndDate, int TaskCount, int CompletedTasks, int MemberCount, DateTime CreatedAt);
public record ProjectMemberDto(Guid UserId, string Email, string FullName, DateTime JoinedAt);
public record AddProjectMemberRequest(string Email);
