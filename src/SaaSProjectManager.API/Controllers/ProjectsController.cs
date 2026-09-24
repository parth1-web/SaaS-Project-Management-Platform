using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSProjectManager.API.Extensions;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projects;
    public ProjectsController(IProjectService projects) { _projects = projects; }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest req, CancellationToken ct)
    {
        var res = await _projects.CreateAsync(User.GetUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { id = res.Id }, res);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? organizationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var res = await _projects.ListAsync(User.GetUserId(), organizationId, page, pageSize, ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var res = await _projects.GetByIdAsync(User.GetUserId(), id, ct);
        return Ok(res);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest req, CancellationToken ct)
    {
        var res = await _projects.UpdateAsync(User.GetUserId(), id, req, ct);
        return Ok(res);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _projects.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> Members(Guid id, CancellationToken ct)
    {
        var res = await _projects.GetMembersAsync(User.GetUserId(), id, ct);
        return Ok(res);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddProjectMemberRequest req, CancellationToken ct)
    {
        var res = await _projects.AddMemberAsync(User.GetUserId(), id, req, ct);
        return Ok(res);
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _projects.RemoveMemberAsync(User.GetUserId(), id, userId, ct);
        return NoContent();
    }
}
