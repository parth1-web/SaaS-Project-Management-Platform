using System.Net;
using System.Text.Json;
using SaaSProjectManager.Application.Exceptions;

namespace SaaSProjectManager.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var (status, title) = ex switch
        {
            NotFoundException => (HttpStatusCode.NotFound, ex.Message),
            ForbiddenException => (HttpStatusCode.Forbidden, ex.Message),
            ConflictException => (HttpStatusCode.Conflict, ex.Message),
            UnauthorizedException => (HttpStatusCode.Unauthorized, ex.Message),
            FluentValidation.ValidationException vex => (HttpStatusCode.UnprocessableEntity, string.Join("; ", vex.Errors.Select(e => e.ErrorMessage))),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        if (status == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Unhandled exception");
        else
            _logger.LogWarning(ex, "Handled {Status}: {Msg}", status, ex.Message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)status;
        var payload = JsonSerializer.Serialize(new
        {
            error = title,
            status = (int)status,
            traceId = context.TraceIdentifier
        });
        await context.Response.WriteAsync(payload);
    }
}
