# SaaS Project Management Platform

Portfolio-grade multi-tenant project management SaaS: organizations, projects, tasks (Kanban), comments, notifications, realtime, attachments, search, Redis caching, background jobs, activity logs, JWT auth, RBAC, tests, CI/CD.

![CI](https://github.com/parth1-web/SaaS-Project-Management-Platform/actions/workflows/ci/badge.svg)

## Features
- Auth (register/login/refresh/logout/me), JWT + refresh rotation
- Organizations (CRUD, members, roles Owner/Admin/Manager/Member)
- Projects (CRUD, members, status, dates, pagination)
- Tasks (CRUD, status/priority, assignment, due dates, filtering, search, pagination, Kanban)
- Comments, Notifications (unread, mark read), Attachments (10MB, allowlist)
- Dashboard (metrics + Recharts), Activity timeline
- Realtime SignalR (`/hubs/project`, `/hubs/notifications`)
- Redis cache-aside (fallback memory), Background (deadline reminders, token cleanup)
- Validation (FluentValidation + Zod), Serilog, Swagger, global errors, rate limiting, CORS

## Stack
- Backend: C#, .NET 8, ASP.NET Core Web API, EF Core, PostgreSQL, Clean Architecture, JWT, RBAC, FluentValidation, Serilog, SignalR, Redis, BackgroundService, xUnit
- Frontend: React, TypeScript, Vite, Bootstrap + React-Bootstrap (no Tailwind), Router, TanStack Query, Axios, Zustand, Hook Form + Zod, Recharts, SignalR client, Lucide
- DevOps: Git, GitHub Actions, env vars, cloud deploy (no Docker)

## Project Structure
```
SaaSProjectManager/
  src/SaaSProjectManager.API/ (Controllers, Hubs, Middleware, Program)
  src/SaaSProjectManager.Application/ (Services, DTOs, Validators, Interfaces)
  src/SaaSProjectManager.Domain/ (Entities, Enums)
  src/SaaSProjectManager.Infrastructure/ (DbContext, JWT, Redis, Background)
  tests/...UnitTests, ...IntegrationTests
  frontend/saas-project-manager-web/ (api, components, pages, routes, store)
  docs/requirements.md, architecture/, database/erd.md, api/
  .github/workflows/ci.yml
```

## Local Development

### Backend
```powershell
# PostgreSQL connection in src/SaaSProjectManager.API/appsettings.Development.json
dotnet restore SaaSProjectManager.sln
dotnet build SaaSProjectManager.sln
dotnet test SaaSProjectManager.sln
cd src/SaaSProjectManager.API
dotnet ef migrations add InitialCreate --project ../SaaSProjectManager.Infrastructure
dotnet ef database update --project ../SaaSProjectManager.Infrastructure
dotnet run --urls http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

Env vars (prod): `ConnectionStrings__DefaultConnection`, `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`, `Frontend__Url`, `Redis__Connection` / `ConnectionStrings__Redis`.

### Frontend
```powershell
cd frontend/saas-project-manager-web
npm install
# .env: VITE_API_URL=http://localhost:5000
npm run dev    # http://localhost:5173
npm run build
```

## API Examples
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{"firstName":"Ada","lastName":"L","email":"ada@ex.com","password":"Secret123!"}'

# Create org (Bearer $TOKEN)
curl -X POST http://localhost:5000/api/organizations \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"name":"Acme","description":"demo"}'
```

Full reference: `docs/api/api.md`, `docs/architecture/architecture.md`, `docs/database/erd.md`.

## Testing
```powershell
dotnet test SaaSProjectManager.sln
# Frontend
npm run build
```

## Deployment
- Backend: Azure / Render / Railway / AWS (set env vars, run migrations, HTTPS)
- Frontend: Vercel / Netlify / Azure Static Web Apps (`VITE_API_URL` → backend URL)
- DB: Neon / Supabase / Railway / Azure PostgreSQL; Redis: Upstash / Redis Cloud / Azure Cache

## Screenshots
Add UI screenshots here (dashboard, board, orgs).

## Future
Sprints, labels, drag-drop, calendar, time tracking, email invites, dark mode, billing, AI summaries.
