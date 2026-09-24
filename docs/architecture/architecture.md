# Architecture

```
React UI (TS, Bootstrap)
  │ HTTP / SignalR
  ▼
ASP.NET Core API (Controllers, Middleware, Auth, Swagger)
  ▼
Application (Services, DTOs, Validators, Interfaces)
  ▼
Domain (Entities, Enums, Rules)
  ▲
Infrastructure (EF Core/PostgreSQL, Redis, File Storage, JWT, Background)
```

## Dependency Direction
- API → Application → Domain
- Infrastructure → Application → Domain
- Domain has zero dependencies on ASP.NET, EF, Redis, SignalR.

## Backend Layers
- API: Controllers (Auth, Organizations, Projects, Tasks, Comments, Notifications, Attachments, Dashboard), Hubs (NotificationHub, ProjectHub), Middleware (ExceptionHandling), Program (JWT, CORS, RateLimit, Serilog, Swagger, SignalR)
- Application: AuthService, OrganizationService, ProjectService, TaskService, CommentService, NotificationService, ActivityLogService, DashboardService, AttachmentService; Validators (FluentValidation); PagedResult; Exceptions (NotFound/Forbidden/Conflict/Unauthorized)
- Domain: User, Organization, OrganizationMember, Project, ProjectMember, TaskItem (table Tasks), Comment, RefreshToken, Notification, ActivityLog, Attachment, Invitation, Label, TaskLabel, Sprint; Enums (OrganizationRole, ProjectStatus, TaskStatus, TaskPriority, NotificationType)
- Infrastructure: ApplicationDbContext (relationships, unique indexes, cascade), JwtService, CacheService (Redis + Memory fallback), TokenCleanupService, DeadlineReminderService

## Data Flow (Create Task)
```
React Form → Axios → POST /api/projects/{id}/tasks
→ Auth → Org membership check → Validation
→ TaskService → EF Core → PostgreSQL
→ ActivityLog + Notification
→ SignalR broadcast → UI invalidates TanStack Query
```

## AuthZ Model
`User + Organization + Role + Resource`. Backend enforces:
- Org member required for org/project/task access
- Member role: only assigned projects, cannot create projects or manage members
- Manager: create/manage assigned projects, tasks
- Admin: manage members/projects/tasks, view logs
- Owner: full + delete org, assign Owner/Admin
- ProjectMember table further restricts Member access.
- Comment edit/delete: owner or Owner/Admin.
- Frontend never decides security.

## Caching Strategy (cache-aside)
```
Request → Redis? hit → return
        → miss → PostgreSQL → store Redis (2-5min) → return
Invalidate on writes (dashboard keys).
```

## Realtime
- `/hubs/project`: JoinProject(projectId), events TaskCreated/Updated/StatusChanged/Assigned, CommentAdded
- `/hubs/notifications`: per-user group `user-{id}`
- JWT via `?access_token=` for sockets.
