using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSProjectManager.API.Extensions;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private readonly IDemoService _demo;
    public DemoController(IDemoService demo) { _demo = demo; }

    /// <summary>
    /// Seeds a sample workspace into the caller's own account.
    /// Idempotent: returns the existing Demo Workspace if already seeded.
    /// </summary>
    [HttpPost("seed")]
    [ProducesResponseType(typeof(Application.DTOs.DemoSeedResponse), 200)]
    public async Task<IActionResult> Seed(CancellationToken ct)
    {
        var res = await _demo.SeedAsync(User.GetUserId(), ct);
        return Ok(res);
    }
}
