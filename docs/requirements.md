# Requirements

## Goal
Multi-tenant SaaS Project Management Platform where users belong to multiple organizations with roles (Owner, Admin, Manager, Member).

## Functional Requirements
- Auth: register, login, JWT + refresh rotation, logout, me
- Organizations: CRUD, members (add, role change, remove), multi-tenancy enforced backend-side
- Projects: CRUD scoped to organization, project members, status, dates, pagination
- Tasks: CRUD per project, status (Todo, InProgress, Review, Completed), priority (Low, Medium, High, Urgent), assignment, due dates, filtering (status, priority, assignee, search, due dates), pagination
- Comments: CRUD per task, ownership enforced
- Notifications: TaskAssigned, TaskStatusChanged, CommentAdded, DeadlineReminder, etc. List, unread count, mark read/all
- Attachments: upload/list/download/delete per task, 10MB limit, allowlist (.png,.jpg,.jpeg,.pdf,.txt,.md,.docx,.xlsx,.csv,.zip), local storage dev / S3/Blob prod
- Search: global task search across user's orgs (title, description + filters)
- Dashboard: totals (orgs, projects, tasks, completed, pending, overdue) + charts (by status, by priority)
- Activity logs: org-scoped audit (project/task/comment/member events), timeline UI
- Realtime: SignalR hubs `/hubs/notifications`, `/hubs/project` (TaskCreated/Updated/StatusChanged/Assigned, CommentAdded)
- Caching: Redis cache-aside for dashboard + summaries, fallback to memory when Redis absent
- Background: deadline reminders (hourly), refresh-token cleanup (6h)

## Non-Functional
- Clean Architecture, DTOs only (no EF entities exposed), FluentValidation frontend+backend, Serilog, global exception → consistent JSON `{error,status,traceId}`
- Security: password hashing (Identity PasswordHasher), JWT secret via env, CORS, rate limiting, file validation, no secrets in git
- Performance: pagination everywhere, indexes (org, project, task status/priority/assignee/due), AsNoTracking where appropriate, DTO projections, avoid N+1
- Frontend: React+TS+Vite+Bootstrap/React-Bootstrap, Router, TanStack Query (server), Zustand (auth/UI), Hook Form+Zod, Recharts, SignalR client, Lucide icons. Every page: loading/error/empty states, responsive.
- Testing: xUnit unit (validators, auth, org, task) + integration (WebApplicationFactory + InMemory, authz 401/403/404)
- CI: GitHub Actions build + test backend + build frontend
- No Docker, no Tailwind (per constraints).
