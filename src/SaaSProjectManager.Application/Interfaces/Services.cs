using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Application.DTOs;

namespace SaaSProjectManager.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
}

public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string email);
    string GenerateRefreshToken();
    DateTime GetAccessTokenExpiry();
}

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
}

public interface IOrganizationService
{
    Task<OrganizationDto> CreateAsync(Guid userId, CreateOrganizationRequest request, CancellationToken ct = default);
    Task<PagedResult<OrganizationDto>> ListAsync(Guid userId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<OrganizationDto> GetByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<OrganizationDto> UpdateAsync(Guid userId, Guid id, UpdateOrganizationRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<List<OrganizationMemberDto>> GetMembersAsync(Guid userId, Guid orgId, CancellationToken ct = default);
    Task<OrganizationMemberDto> AddMemberAsync(Guid userId, Guid orgId, AddMemberRequest request, CancellationToken ct = default);
    Task<OrganizationMemberDto> UpdateMemberRoleAsync(Guid userId, Guid orgId, Guid memberUserId, UpdateMemberRoleRequest request, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid userId, Guid orgId, Guid memberUserId, CancellationToken ct = default);
}

public interface IProjectService
{
    Task<ProjectDto> CreateAsync(Guid userId, CreateProjectRequest request, CancellationToken ct = default);
    Task<PagedResult<ProjectDto>> ListAsync(Guid userId, Guid? organizationId = null, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<ProjectDto> GetByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<ProjectDto> UpdateAsync(Guid userId, Guid id, UpdateProjectRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<List<ProjectMemberDto>> GetMembersAsync(Guid userId, Guid projectId, CancellationToken ct = default);
    Task<ProjectMemberDto> AddMemberAsync(Guid userId, Guid projectId, AddProjectMemberRequest request, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid userId, Guid projectId, Guid memberUserId, CancellationToken ct = default);
}

public interface ITaskService
{
    Task<TaskDto> CreateAsync(Guid userId, Guid projectId, CreateTaskRequest request, CancellationToken ct = default);
    Task<PagedResult<TaskDto>> ListAsync(Guid userId, Guid projectId, TaskFilterParams filter, CancellationToken ct = default);
    Task<PagedResult<TaskDto>> SearchAsync(Guid userId, string? search, string? status, string? priority, Guid? assignee, Guid? projectId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<TaskDto> GetByIdAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task<TaskDto> UpdateAsync(Guid userId, Guid taskId, UpdateTaskRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task<TaskDto> UpdateStatusAsync(Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct = default);
    Task<TaskDto> AssignAsync(Guid userId, Guid taskId, AssignTaskRequest request, CancellationToken ct = default);
}

public interface ICommentService
{
    Task<CommentDto> CreateAsync(Guid userId, Guid taskId, CreateCommentRequest request, CancellationToken ct = default);
    Task<PagedResult<CommentDto>> ListAsync(Guid userId, Guid taskId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<CommentDto> UpdateAsync(Guid userId, Guid commentId, UpdateCommentRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid commentId, CancellationToken ct = default);
}

public interface INotificationService
{
    Task<PagedResult<NotificationDto>> ListAsync(Guid userId, int page = 1, int pageSize = 20, bool unreadOnly = false, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
    Task MarkAsReadAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default);
    Task CreateAsync(Guid userId, Domain.Enums.NotificationType type, string title, string message, Guid? relatedId = null, CancellationToken ct = default);
}

public interface IActivityLogService
{
    Task LogAsync(Guid orgId, Guid userId, string action, string entityType, Guid? entityId, string? description, CancellationToken ct = default);
    Task<PagedResult<ActivityLogDto>> ListAsync(Guid userId, Guid orgId, int page = 1, int pageSize = 20, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync(Guid userId, Guid? organizationId = null, CancellationToken ct = default);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default);
}

public interface IAttachmentService
{
    Task<AttachmentDto> UploadAsync(Guid userId, Guid taskId, string fileName, string contentType, long size, Stream content, CancellationToken ct = default);
    Task<List<AttachmentDto>> ListAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task<(Stream content, string contentType, string fileName)> DownloadAsync(Guid userId, Guid attachmentId, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid attachmentId, CancellationToken ct = default);
}
