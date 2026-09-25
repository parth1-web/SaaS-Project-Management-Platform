using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Application.Services;
using SaaSProjectManager.Application.Validators;
using SaaSProjectManager.Domain.Entities;
using SaaSProjectManager.Infrastructure.Auth;
using SaaSProjectManager.Infrastructure.Caching;
using SaaSProjectManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;

namespace SaaSProjectManager.UnitTests;

public class TestDbContext : ApplicationDbContext
{
    public TestDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
}

public static class TestHelper
{
    public static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    public static IPasswordHasher<User> Hasher() => new PasswordHasher<User>();
    public static IJwtService Jwt() => new JwtService(new JwtSettings
    {
        Secret = "unit-test-super-secret-key-min-32-chars-123456!!",
        Issuer = "Test",
        Audience = "Test"
    });
    public static ICacheService Cache()
    {
        var mem = new MemoryCache(new MemoryCacheOptions());
        return new CacheService(mem);
    }
}

public class ValidatorTests
{
    [Fact]
    public void RegisterValidator_Rejects_InvalidEmail()
    {
        var v = new RegisterValidator();
        var result = v.Validate(new RegisterRequest("A", "B", "not-an-email", "123"));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void RegisterValidator_Accepts_Valid()
    {
        var v = new RegisterValidator();
        var result = v.Validate(new RegisterRequest("John", "Doe", "john@example.com", "Password123!"));
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateProjectValidator_Rejects_BadDates()
    {
        var v = new CreateProjectValidator();
        var result = v.Validate(new CreateProjectRequest(Guid.NewGuid(), "P", null, Domain.Enums.ProjectStatus.Active, DateTime.UtcNow.AddDays(5), DateTime.UtcNow));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateTaskValidator_Rejects_EmptyTitle()
    {
        var v = new CreateTaskValidator();
        v.Validate(new CreateTaskRequest("", null, Domain.Enums.TaskPriority.Medium, null, null)).IsValid.Should().BeFalse();
    }
}

public class JwtServiceTests
{
    [Fact]
    public void GenerateAccessToken_Returns_Jwt()
    {
        var jwt = TestHelper.Jwt();
        var token = jwt.GenerateAccessToken(Guid.NewGuid(), "a@b.com");
        token.Should().NotBeNullOrEmpty();
        token.Split('.').Should().HaveCount(3);
    }

    [Fact]
    public void GenerateRefreshToken_Is_Unique()
    {
        var jwt = TestHelper.Jwt();
        var a = jwt.GenerateRefreshToken();
        var b = jwt.GenerateRefreshToken();
        a.Should().NotBe(b);
    }
}

public class AuthServiceTests
{
    [Fact]
    public async Task Register_Then_Login_Works()
    {
        using var db = TestHelper.CreateInMemoryDb();
        var svc = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());

        var reg = await svc.RegisterAsync(new RegisterRequest("Jane", "Doe", "jane@example.com", "Secret123!"));
        reg.Email.Should().Be("jane@example.com");
        reg.AccessToken.Should().NotBeNullOrEmpty();

        var login = await svc.LoginAsync(new LoginRequest("jane@example.com", "Secret123!"));
        login.UserId.Should().Be(reg.UserId);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Throws()
    {
        using var db = TestHelper.CreateInMemoryDb();
        var svc = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());
        await svc.RegisterAsync(new RegisterRequest("A", "B", "dup@example.com", "Secret123!"));
        await Assert.ThrowsAsync<Application.Exceptions.ConflictException>(
            () => svc.RegisterAsync(new RegisterRequest("A", "B", "dup@example.com", "Secret123!")));
    }

    [Fact]
    public async Task Login_WrongPassword_Throws()
    {
        using var db = TestHelper.CreateInMemoryDb();
        var svc = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());
        await svc.RegisterAsync(new RegisterRequest("A", "B", "u@example.com", "Secret123!"));
        await Assert.ThrowsAsync<Application.Exceptions.UnauthorizedException>(
            () => svc.LoginAsync(new LoginRequest("u@example.com", "wrong")));
    }

    [Fact]
    public async Task Refresh_Rotation_Works()
    {
        using var db = TestHelper.CreateInMemoryDb();
        var svc = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());
        var reg = await svc.RegisterAsync(new RegisterRequest("A", "B", "r@example.com", "Secret123!"));
        var refreshed = await svc.RefreshAsync(reg.RefreshToken);
        refreshed.RefreshToken.Should().NotBe(reg.RefreshToken);
        // old token revoked
        await Assert.ThrowsAsync<Application.Exceptions.UnauthorizedException>(
            () => svc.RefreshAsync(reg.RefreshToken));
    }
}

public class OrganizationServiceTests
{
    private async Task<(ApplicationDbContext db, Guid userId)> SetupUserAsync()
    {
        var db = TestHelper.CreateInMemoryDb();
        var auth = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());
        var reg = await auth.RegisterAsync(new RegisterRequest("Owner", "One", $"o{Guid.NewGuid():N}@ex.com", "Secret123!"));
        return (db, reg.UserId);
    }

    [Fact]
    public async Task Create_Organization_Makes_Owner()
    {
        var (db, userId) = await SetupUserAsync();
        var activity = new ActivityLogService(db);
        var svc = new OrganizationService(db, activity, TestHelper.Cache());
        var org = await svc.CreateAsync(userId, new CreateOrganizationRequest("Acme", "Test org"));
        org.Name.Should().Be("Acme");
        org.UserRole.Should().Be("Owner");
        db.Dispose();
    }

    [Fact]
    public async Task NonMember_Cannot_Access_Org()
    {
        var (db, userId) = await SetupUserAsync();
        var activity = new ActivityLogService(db);
        var svc = new OrganizationService(db, activity, TestHelper.Cache());
        var org = await svc.CreateAsync(userId, new CreateOrganizationRequest("Acme", null));

        using var db2 = TestHelper.CreateInMemoryDb();
        // different db won't have org; use same db but different user
        var other = new User { FirstName = "X", LastName = "Y", Email = "x@y.com", PasswordHash = "h" };
        db.Users.Add(other);
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<Application.Exceptions.ForbiddenException>(
            () => svc.GetByIdAsync(other.Id, org.Id));
        db.Dispose();
    }
}

public class TaskServiceTests
{
    [Fact]
    public async Task Create_And_Filter_Tasks()
    {
        using var db = TestHelper.CreateInMemoryDb();
        var auth = new AuthService(db, TestHelper.Jwt(), TestHelper.Hasher());
        var reg = await auth.RegisterAsync(new RegisterRequest("P", "M", $"pm{Guid.NewGuid():N}@ex.com", "Secret123!"));
        var activity = new ActivityLogService(db);
        var notifs = new NotificationService(db);
        var orgSvc = new OrganizationService(db, activity, TestHelper.Cache());
        var projSvc = new ProjectService(db, activity, TestHelper.Cache());
        var taskSvc = new Application.Services.TaskService(db, activity, notifs, TestHelper.Cache());

        var org = await orgSvc.CreateAsync(reg.UserId, new CreateOrganizationRequest("Org1", null));
        var proj = await projSvc.CreateAsync(reg.UserId, new CreateProjectRequest(org.Id, "Proj1", null, Domain.Enums.ProjectStatus.Active, null, null));
        var t1 = await taskSvc.CreateAsync(reg.UserId, proj.Id, new CreateTaskRequest("Fix bug", "desc", Domain.Enums.TaskPriority.High, DateTime.UtcNow.AddDays(2), null));
        var t2 = await taskSvc.CreateAsync(reg.UserId, proj.Id, new CreateTaskRequest("Write docs", null, Domain.Enums.TaskPriority.Low, null, null));

        t1.Title.Should().Be("Fix bug");

        var all = await taskSvc.ListAsync(reg.UserId, proj.Id, new TaskFilterParams { Page = 1, PageSize = 10 });
        all.TotalCount.Should().Be(2);

        var filtered = await taskSvc.ListAsync(reg.UserId, proj.Id, new TaskFilterParams { Priority = Domain.Enums.TaskPriority.High, Page = 1, PageSize = 10 });
        filtered.TotalCount.Should().Be(1);

        var searched = await taskSvc.SearchAsync(reg.UserId, "docs", null, null, null, null);
        searched.TotalCount.Should().Be(1);
    }
}
