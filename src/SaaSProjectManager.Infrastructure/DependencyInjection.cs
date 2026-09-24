using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SaaSProjectManager.Application.Interfaces;
using SaaSProjectManager.Infrastructure.Auth;
using SaaSProjectManager.Infrastructure.Background;
using SaaSProjectManager.Infrastructure.Caching;
using SaaSProjectManager.Infrastructure.Persistence;

namespace SaaSProjectManager.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var conn = config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Database=saas_pm;Username=postgres;Password=postgres";

        services.AddDbContext<ApplicationDbContext>(opt =>
        {
            opt.UseNpgsql(conn);
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IJwtService, JwtService>();
        services.AddMemoryCache();
        services.AddSingleton<ICacheService, CacheService>();
        services.AddHostedService<TokenCleanupService>();
        services.AddHostedService<DeadlineReminderService>();

        return services;
    }
}
