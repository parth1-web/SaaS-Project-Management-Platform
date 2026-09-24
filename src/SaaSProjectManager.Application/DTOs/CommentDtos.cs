namespace SaaSProjectManager.Application.DTOs;

public record CreateCommentRequest(string Content);
public record UpdateCommentRequest(string Content);
public record CommentDto(Guid Id, Guid TaskId, Guid UserId, string UserName, string Content, DateTime CreatedAt, DateTime UpdatedAt);
