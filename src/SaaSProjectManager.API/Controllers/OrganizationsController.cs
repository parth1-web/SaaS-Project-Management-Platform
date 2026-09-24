using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSProjectManager.API.Extensions;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/organizations")]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _orgs;
    private readonly IActivityLogService _logs;
    public OrganizationsController(IOrganizationService orgs, IActivityLogService logs)
    {
        _orgs = orgs; _logs = logs;
    }

    [HttpPost]
    [ProducesResponseType(typeof(OrganizationDto), 201)]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest req, CancellationToken ct)
    {
        var res = await _orgs.CreateAsync(User.GetUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { id = res.Id }, res);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var res = await _orgs.ListAsync(User.GetUserId(), page, pageSize, ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var res = await _orgs.GetByIdAsync(User.GetUserId(), id, ct);
        return Ok(res);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOrganizationRequest req, CancellationToken ct)
    {
        var res = await _orgs.UpdateAsync(User.GetUserId(), id, req, ct);
        return Ok(res);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _orgs.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken ct)
    {
        var res = await _orgs.GetMembersAsync(User.GetUserId(), id, ct);
        return Ok(res);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberRequest req, CancellationToken ct)
    {
        var res = await _orgs.AddMemberAsync(User.GetUserId(), id, req, ct);
        return Ok(res);
    }

    [HttpPut("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> UpdateRole(Guid id, Guid userId, [FromBody] UpdateMemberRoleRequest req, CancellationToken ct)
    {
        var res = await _orgs.UpdateMemberRoleAsync(User.GetUserId(), id, userId, req, ct);
        return Ok(res);
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _orgs.RemoveMemberAsync(User.GetUserId(), id, userId, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/activity")]
    public async Task<IActionResult> Activity(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var res = await _logs.ListAsync(User.GetUserId(), id, page, pageSize, ct);
        return Ok(res);
    }
}
