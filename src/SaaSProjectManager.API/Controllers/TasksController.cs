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
public class TasksController : ControllerBase
{
    private readonly ITaskService _tasks;
    private readonly IHubContext<ProjectHub> _hub;
    public TasksController(ITaskService tasks, IHubContext<ProjectHub> hub)
    {
        _tasks = tasks; _hub = hub;
    }

    [HttpPost("api/projects/{projectId:guid}/tasks")]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateTaskRequest req, CancellationToken ct)
    {
        var res = await _tasks.CreateAsync(User.GetUserId(), projectId, req, ct);
        await _hub.Clients.Group($"project-{projectId}").SendAsync("TaskCreated", res, ct);
        return CreatedAtAction(nameof(GetById), new { id = res.Id }, res);
    }

    [HttpGet("api/projects/{projectId:guid}/tasks")]
    public async Task<IActionResult> List(Guid projectId,
        [FromQuery] string? status, [FromQuery] string? priority,
        [FromQuery] Guid? assignee, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new TaskFilterParams { Page = page, PageSize = pageSize, Search = search, Assignee = assignee };
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<Domain.Enums.TaskStatus>(status, true, out var st)) filter.Status = st;
        if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<Domain.Enums.TaskPriority>(priority, true, out var pr)) filter.Priority = pr;
        var res = await _tasks.ListAsync(User.GetUserId(), projectId, filter, ct);
        return Ok(res);
    }

    [HttpGet("api/tasks/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var res = await _tasks.GetByIdAsync(User.GetUserId(), id, ct);
        return Ok(res);
    }

    [HttpPut("api/tasks/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskRequest req, CancellationToken ct)
    {
        var res = await _tasks.UpdateAsync(User.GetUserId(), id, req, ct);
        await _hub.Clients.Group($"project-{res.ProjectId}").SendAsync("TaskUpdated", res, ct);
        return Ok(res);
    }

    [HttpDelete("api/tasks/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _tasks.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpPatch("api/tasks/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest req, CancellationToken ct)
    {
        var res = await _tasks.UpdateStatusAsync(User.GetUserId(), id, req, ct);
        await _hub.Clients.Group($"project-{res.ProjectId}").SendAsync("TaskStatusChanged", res, ct);
        return Ok(res);
    }

    [HttpPatch("api/tasks/{id:guid}/assignment")]
    public async Task<IActionResult> Assign(Guid id, [FromBody] AssignTaskRequest req, CancellationToken ct)
    {
        var res = await _tasks.AssignAsync(User.GetUserId(), id, req, ct);
        await _hub.Clients.Group($"project-{res.ProjectId}").SendAsync("TaskAssigned", res, ct);
        return Ok(res);
    }

    [HttpGet("api/tasks/search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? priority,
        [FromQuery] Guid? assignee, [FromQuery] Guid? projectId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var res = await _tasks.SearchAsync(User.GetUserId(), search, status, priority, assignee, projectId, page, pageSize, ct);
        return Ok(res);
    }
}
