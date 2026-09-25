# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY SaaSProjectManager.sln .
COPY src/SaaSProjectManager.API/SaaSProjectManager.API.csproj src/SaaSProjectManager.API/
COPY src/SaaSProjectManager.Application/SaaSProjectManager.Application.csproj src/SaaSProjectManager.Application/
COPY src/SaaSProjectManager.Domain/SaaSProjectManager.Domain.csproj src/SaaSProjectManager.Domain/
COPY src/SaaSProjectManager.Infrastructure/SaaSProjectManager.Infrastructure.csproj src/SaaSProjectManager.Infrastructure/

# Restore dependencies
RUN dotnet restore SaaSProjectManager.sln

# Copy source code
COPY . .

# Build and publish
WORKDIR /src/src/SaaSProjectManager.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false /p:PublishReadyToRun=true

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Copy published app
COPY --from=build --chown=appuser:appgroup /app/publish .

# Expose port (Render uses PORT env var, default 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "SaaSProjectManager.API.dll"]