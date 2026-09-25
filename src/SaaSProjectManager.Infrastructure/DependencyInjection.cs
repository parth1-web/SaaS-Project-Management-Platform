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

        // Render auto-wires PostgreSQL as a URL (postgres://user:pass@host/db),
        // but Npgsql needs Host=...;Database=... format. Convert when needed.
        conn = NormalizePostgresConnectionString(conn);

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

    internal static string NormalizePostgresConnectionString(string raw)
    {
        if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(raw);
            var userInfo = uri.UserInfo.Split(':', 2);
            var builder = new Npgsql.NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.IsDefaultPort ? 5432 : uri.Port,
                Database = uri.AbsolutePath.Trim('/'),
                Username = Uri.UnescapeDataString(userInfo[0]),
                Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
                SslMode = Npgsql.SslMode.Require,
            };
            return builder.ToString();
        }
        return raw;
    }
}
