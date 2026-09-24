using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Common;
using SaaSProjectManager.Infrastructure.Persistence;

namespace SaaSProjectManager.IntegrationTests;

public class CustomFactory : WebApplicationFactory<Program>
{
    private const string DbName = "IntegrationTestDb-Shared";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registrations (options + context)
            var optionsDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (optionsDescriptor != null) services.Remove(optionsDescriptor);
            var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
            if (contextDescriptor != null) services.Remove(contextDescriptor);

            services.AddDbContext<ApplicationDbContext>(o =>
                o.UseInMemoryDatabase(DbName));

            // Remove background services for tests
            var hosted = services.Where(d => d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService)).ToList();
            foreach (var h in hosted) services.Remove(h);
        });
    }
}

public class ApiTests : IClassFixture<CustomFactory>
{
    private readonly CustomFactory _factory;
    public ApiTests(CustomFactory factory) { _factory = factory; }

    private HttpClient AnonymousClient() => _factory.CreateClient();

    private async Task<(HttpClient client, AuthResponse auth)> AuthenticatedClientAsync(string? email = null)
    {
        var client = _factory.CreateClient();
        email ??= $"it{Guid.NewGuid():N}@example.com";
        var reg = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Int",
            lastName = "Test",
            email,
            password = "Secret123!"
        });
        reg.StatusCode.Should().Be(HttpStatusCode.Created);
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return (client, auth);
    }

    [Fact]
    public async Task Health_Returns_Ok()
    {
        var client = AnonymousClient();
        var res = await client.GetAsync("/health");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Register_Login_Me_Flow()
    {
        var client = AnonymousClient();
        var email = $"flow{Guid.NewGuid():N}@example.com";
        var reg = await client.PostAsJsonAsync("/api/auth/register", new { firstName = "F", lastName = "L", email, password = "Secret123!" });
        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Secret123!" });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        var me = await client.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Unauthorized_When_No_Token()
    {
        var client = AnonymousClient();
        var res = await client.GetAsync("/api/organizations");
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Organization_Project_Task_Comment_Flow()
    {
        var (client, _) = await AuthenticatedClientAsync();

        // Create org
        var orgRes = await client.PostAsJsonAsync("/api/organizations", new { name = "E2E Org", description = "test" });
        orgRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var org = await orgRes.Content.ReadFromJsonAsync<OrganizationDto>();

        // List orgs
        var list = await client.GetAsync("/api/organizations?page=1&pageSize=10");
        list.StatusCode.Should().Be(HttpStatusCode.OK);

        // Create project
        var projRes = await client.PostAsJsonAsync("/api/projects", new
        {
            organizationId = org!.Id,
            name = "E2E Project",
            description = "desc",
            status = 1,
            startDate = (DateTime?)null,
            endDate = (DateTime?)null
        });
        projRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var proj = await projRes.Content.ReadFromJsonAsync<ProjectDto>();

        // Create task
        var taskRes = await client.PostAsJsonAsync($"/api/projects/{proj!.Id}/tasks", new
        {
            title = "E2E Task",
            description = "do it",
            priority = 2,
            dueDate = (DateTime?)DateTime.UtcNow.AddDays(3),
            assignedTo = (Guid?)null
        });
        taskRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await taskRes.Content.ReadFromJsonAsync<TaskDto>();

        // List tasks
        var tasksList = await client.GetAsync($"/api/projects/{proj.Id}/tasks?page=1&pageSize=10");
        tasksList.StatusCode.Should().Be(HttpStatusCode.OK);

        // Update status
        var statusRes = await client.PatchAsJsonAsync($"/api/tasks/{task!.Id}/status", new { status = 1 });
        statusRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Comment
        var commentRes = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/comments", new { content = "Looks good!" });
        commentRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var commentsList = await client.GetAsync($"/api/tasks/{task.Id}/comments");
        commentsList.StatusCode.Should().Be(HttpStatusCode.OK);

        // Dashboard
        var dash = await client.GetAsync("/api/dashboard");
        dash.StatusCode.Should().Be(HttpStatusCode.OK);

        // Notifications
        var notifs = await client.GetAsync("/api/notifications");
        notifs.StatusCode.Should().Be(HttpStatusCode.OK);

        // Search
        var search = await client.GetAsync("/api/tasks/search?search=E2E");
        search.StatusCode.Should().Be(HttpStatusCode.OK);

        // Activity
        var activity = await client.GetAsync($"/api/organizations/{org.Id}/activity");
        activity.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Forbidden_When_Accessing_Other_Org()
    {
        var (clientA, _) = await AuthenticatedClientAsync();
        var (clientB, _) = await AuthenticatedClientAsync();

        var orgRes = await clientA.PostAsJsonAsync("/api/organizations", new { name = "Private Org", description = "x" });
        var org = await orgRes.Content.ReadFromJsonAsync<OrganizationDto>();

        var forbidden = await clientB.GetAsync($"/api/organizations/{org!.Id}");
        forbidden.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
