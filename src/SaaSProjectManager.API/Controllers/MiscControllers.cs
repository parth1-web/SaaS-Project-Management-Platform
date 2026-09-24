using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SaaSProjectManager.API.Extensions;
using SaaSProjectManager.API.Hubs;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.API.Controllers;

[ApiController]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _comments;
    private readonly IHubContext<ProjectHub> _hub;
    public CommentsController(ICommentService comments, IHubContext<ProjectHub> hub)
    {
        _comments = comments; _hub = hub;
    }

    [HttpPost("api/tasks/{taskId:guid}/comments")]
    public async Task<IActionResult> Create(Guid taskId, [FromBody] CreateCommentRequest req, CancellationToken ct)
    {
        var res = await _comments.CreateAsync(User.GetUserId(), taskId, req, ct);
        await _hub.Clients.Group($"project-{taskId}").SendAsync("CommentAdded", res, ct);
        return CreatedAtAction(nameof(List), new { taskId }, res);
    }

    [HttpGet("api/tasks/{taskId:guid}/comments")]
    public async Task<IActionResult> List(Guid taskId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var res = await _comments.ListAsync(User.GetUserId(), taskId, page, pageSize, ct);
        return Ok(res);
    }

    [HttpPut("api/comments/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCommentRequest req, CancellationToken ct)
    {
        var res = await _comments.UpdateAsync(User.GetUserId(), id, req, ct);
        return Ok(res);
    }

    [HttpDelete("api/comments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _comments.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _svc;
    public NotificationsController(INotificationService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] bool unreadOnly = false, CancellationToken ct = default)
    {
        var res = await _svc.ListAsync(User.GetUserId(), page, pageSize, unreadOnly, ct);
        return Ok(res);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var count = await _svc.GetUnreadCountAsync(User.GetUserId(), ct);
        return Ok(new { unreadCount = count });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await _svc.MarkAsReadAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await _svc.MarkAllAsReadAsync(User.GetUserId(), ct);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dash;
    public DashboardController(IDashboardService dash) { _dash = dash; }

    [HttpGet]
    public async Task<IActionResult> Stats([FromQuery] Guid? organizationId, CancellationToken ct)
    {
        var res = await _dash.GetStatsAsync(User.GetUserId(), organizationId, ct);
        return Ok(res);
    }
}

[ApiController]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _svc;
    public AttachmentsController(IAttachmentService svc) { _svc = svc; }

    [HttpPost("api/tasks/{taskId:guid}/attachments")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload(Guid taskId, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { error = "No file uploaded." });
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        ms.Position = 0;
        var res = await _svc.UploadAsync(User.GetUserId(), taskId, file.FileName, file.ContentType, file.Length, ms, ct);
        return CreatedAtAction(nameof(List), new { taskId }, res);
    }

    [HttpGet("api/tasks/{taskId:guid}/attachments")]
    public async Task<IActionResult> List(Guid taskId, CancellationToken ct)
    {
        var res = await _svc.ListAsync(User.GetUserId(), taskId, ct);
        return Ok(res);
    }

    [HttpGet("api/attachments/{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var (content, contentType, fileName) = await _svc.DownloadAsync(User.GetUserId(), id, ct);
        return File(content, contentType, fileName);
    }

    [HttpDelete("api/attachments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }
}
