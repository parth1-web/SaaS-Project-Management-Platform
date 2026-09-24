using SaaSProjectManager.Domain.Enums;

namespace SaaSProjectManager.Application.DTOs;

public record CreateOrganizationRequest(string Name, string? Description);
public record UpdateOrganizationRequest(string Name, string? Description);
public record OrganizationDto(Guid Id, string Name, string Slug, string? Description, int MemberCount, int ProjectCount, string UserRole, DateTime CreatedAt);
public record OrganizationMemberDto(Guid UserId, string Email, string FullName, OrganizationRole Role, DateTime JoinedAt);
public record UpdateMemberRoleRequest(string Role);
public record AddMemberRequest(string Email, string Role);
