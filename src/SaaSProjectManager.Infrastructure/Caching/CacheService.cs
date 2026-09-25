using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using SaaSProjectManager.Application.Interfaces;
using StackExchange.Redis;

namespace SaaSProjectManager.Infrastructure.Caching;

public class CacheService : ICacheService
{
    private readonly IMemoryCache _memory;
    private readonly IConnectionMultiplexer? _redis;

    public CacheService(IMemoryCache memory, IConfiguration config)
    {
        _memory = memory;
        try
        {
            var conn = config.GetConnectionString("Redis") ?? config["Redis:Connection"];
            if (!string.IsNullOrWhiteSpace(conn) && !conn.Equals("pending", StringComparison.OrdinalIgnoreCase))
                _redis = ConnectionMultiplexer.Connect(NormalizeRedisConnectionString(conn));
        }
        catch
        {
            _redis = null;
        }
    }

    // For tests
    public CacheService(IMemoryCache memory) { _memory = memory; }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        if (_redis != null)
        {
            try
            {
                var db = _redis.GetDatabase();
                var val = await db.StringGetAsync(key);
                if (val.HasValue) return JsonSerializer.Deserialize<T>(val!);
            }
            catch { /* fallback to memory */ }
        }
        if (_memory.TryGetValue(key, out T? mem)) return mem;
        return default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        var exp = expiry ?? TimeSpan.FromMinutes(5);
        _memory.Set(key, value, exp);
        if (_redis != null)
        {
            try
            {
                var db = _redis.GetDatabase();
                await db.StringSetAsync(key, JsonSerializer.Serialize(value), exp);
            }
            catch { }
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _memory.Remove(key);
        if (_redis != null)
        {
            try { await _redis.GetDatabase().KeyDeleteAsync(key); } catch { }
        }
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        // MemoryCache has no prefix scan; best-effort: no-op for memory, scan redis
        if (_redis != null)
        {
            try
            {
                var endpoints = _redis.GetEndPoints();
                foreach (var ep in endpoints)
                {
                    var server = _redis.GetServer(ep);
                    foreach (var key in server.Keys(pattern: prefix + "*"))
                        _redis.GetDatabase().KeyDelete(key);
                }
            }
            catch { }
        }
        return Task.CompletedTask;
    }

    internal static string NormalizeRedisConnectionString(string raw)
    {
        // Accept redis://[[user:]password@]host[:port][/db] and rediss:// (TLS) URLs
        // as well as plain "host:port" strings StackExchange.Redis expects.
        if (raw.StartsWith("redis://", StringComparison.OrdinalIgnoreCase) ||
            raw.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase))
        {
            var ssl = raw.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase);
            var uri = new Uri(raw);
            var options = $"{uri.Host}:{(uri.IsDefaultPort ? 6379 : uri.Port)}";
            var userInfo = uri.UserInfo.Split(':', 2);
            var password = userInfo.Length > 1 ? userInfo[1] : (userInfo[0].Length > 0 ? userInfo[0] : null);
            if (!string.IsNullOrEmpty(password))
                options += $",password={password}";
            if (ssl) options += ",ssl=True";
            if (!string.IsNullOrEmpty(uri.AbsolutePath.Trim('/')) && int.TryParse(uri.AbsolutePath.Trim('/'), out var db))
                options += $",defaultDatabase={db}";
            options += ",abortConnect=False";
            return options;
        }
        return raw;
    }
}
