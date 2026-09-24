# API

Base: `http://localhost:5000` (dev), Swagger: `/swagger`, Health: `/health`

## Auth
- POST /api/auth/register → 201 AuthResponse
- POST /api/auth/login → 200 AuthResponse
- POST /api/auth/refresh {refreshToken} → 200 AuthResponse (rotation)
- POST /api/auth/logout {refreshToken} → 204
- GET /api/auth/me (Bearer) → 200 UserDto

AuthResponse: `{userId,email,fullName,accessToken,accessTokenExpiresAt,refreshToken}`

## Organizations (Bearer)
- POST /api/organizations → 201
- GET /api/organizations?page&pageSize → 200 PagedResult
- GET /api/organizations/{id} → 200
- PUT /api/organizations/{id} → 200
- DELETE /api/organizations/{id} → 204 (Owner only)
- GET /api/organizations/{id}/members → 200
- POST /api/organizations/{id}/members {email,role} → 200
- PUT /api/organizations/{id}/members/{userId} {role} → 200
- DELETE /api/organizations/{id}/members/{userId} → 204
- GET /api/organizations/{id}/activity?page&pageSize → 200

## Projects
- POST /api/projects {organizationId,name,description,status,startDate,endDate} → 201
- GET /api/projects?organizationId&page&pageSize → 200
- GET /api/projects/{id} → 200
- PUT /api/projects/{id} → 200
- DELETE /api/projects/{id} → 204
- GET /api/projects/{id}/members → 200
- POST /api/projects/{id}/members {email} → 200
- DELETE /api/projects/{id}/members/{userId} → 204

## Tasks
- POST /api/projects/{projectId}/tasks {title,description,priority,dueDate,assignedTo} → 201
- GET /api/projects/{projectId}/tasks?status&priority&assignee&search&page&pageSize → 200
- GET /api/tasks/{id} → 200
- PUT /api/tasks/{id} → 200
- DELETE /api/tasks/{id} → 204
- PATCH /api/tasks/{id}/status {status} → 200
- PATCH /api/tasks/{id}/assignment {assignedTo} → 200
- GET /api/tasks/search?search&status&priority&assignee&projectId&page&pageSize → 200

Enums as ints or names (names for query: `?status=InProgress&priority=High`).

## Comments
- POST /api/tasks/{taskId}/comments {content} → 201
- GET /api/tasks/{taskId}/comments?page&pageSize → 200
- PUT /api/comments/{id} {content} → 200
- DELETE /api/comments/{id} → 204

## Notifications / Dashboard / Attachments
- GET /api/notifications?page&pageSize&unreadOnly → 200
- GET /api/notifications/unread-count → 200 `{unreadCount}`
- POST /api/notifications/{id}/read → 204
- POST /api/notifications/read-all → 204
- GET /api/dashboard?organizationId → 200 DashboardStats
- POST /api/tasks/{taskId}/attachments (multipart file) → 201 (10MB, allowlist)
- GET /api/tasks/{taskId}/attachments → 200
- GET /api/attachments/{id}/download → File
- DELETE /api/attachments/{id} → 204

## Errors
`{error,status,traceId}` with 400/401/403/404/409/422/500. 422 for FluentValidation.

## SignalR
- `/hubs/notifications` (Authorize, group `user-{id}`)
- `/hubs/project` (Authorize, JoinProject/LeaveProject, group `project-{id}`, events TaskCreated/Updated/StatusChanged/Assigned, CommentAdded)
- Auth via `?access_token=<jwt>`.
