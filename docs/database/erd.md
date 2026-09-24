# ERD

```
User 1 ── * OrganizationMember * ── 1 Organization 1 ── * Project 1 ── * TaskItem 1 ── * Comment
  │                    │                          │              │               │
  │                    │                          │              │               └── * Attachment
  │                    │                          │              │
  │                    │                          │              └── * ProjectMember * ── 1 User
  │                    │                          │
  │                    │                          └── * ActivityLog
  │                    │
  └── * RefreshToken   └── * Project (via Organization)
  └── * Notification
```

## Tables
- Users(Id PK, Email UNIQUE, FirstName, LastName, PasswordHash, IsActive, CreatedAt, UpdatedAt)
- Organizations(Id PK, Name, Slug UNIQUE, Description, CreatedAt, UpdatedAt)
- OrganizationMembers(Id PK, OrganizationId FK CASCADE, UserId FK CASCADE, Role, JoinedAt, UNIQUE(Org,User))
- Projects(Id PK, OrganizationId FK CASCADE INDEX, Name, Description, Status, StartDate, EndDate, CreatedBy, CreatedAt, UpdatedAt)
- ProjectMembers(Id PK, ProjectId FK CASCADE, UserId FK CASCADE, JoinedAt, UNIQUE(Project,User))
- Tasks(Id PK, ProjectId FK CASCADE INDEX, Title, Description, Status INDEX, Priority INDEX, DueDate INDEX, CreatedBy, AssignedTo INDEX, CreatedAt, UpdatedAt)
- Comments(Id PK, TaskId FK CASCADE INDEX, UserId FK RESTRICT, Content, CreatedAt, UpdatedAt)
- RefreshTokens(Id PK, UserId FK CASCADE INDEX, Token UNIQUE, ExpiresAt, CreatedAt, RevokedAt)
- Notifications(Id PK, UserId FK CASCADE INDEX, Type, Title, Message, IsRead, RelatedEntityId, CreatedAt, INDEX(User,IsRead))
- ActivityLogs(Id PK, OrganizationId FK CASCADE INDEX, UserId FK RESTRICT, Action, EntityType, EntityId, Description, CreatedAt INDEX)
- Attachments(Id PK, TaskId FK CASCADE INDEX, FileName, StoredFileName, ContentType, Size, StoragePath, UploadedBy, CreatedAt)
- Invitations(Id PK, OrganizationId FK, Email, Role, Token UNIQUE, ExpiresAt, Accepted, CreatedAt)
- Labels(Id PK, OrganizationId, Name, Color, UNIQUE(Org,Name))
- TaskLabels(TaskId FK CASCADE, LabelId FK CASCADE, PK(Task,Label))
- Sprints(Id PK, ProjectId FK INDEX, Name, StartDate, EndDate, IsActive, CreatedAt)

## Notes
- GUID PKs everywhere.
- Unique: Users.Email, Organizations.Slug, OrgMember(Org,User), ProjectMember(Project,User), RefreshTokens.Token, Invitations.Token.
- Indexes for filtering: Tasks(Project,Status,Priority,Assignee,Due), Notifications(User,IsRead), ActivityLogs(Org,CreatedAt).
- Delete: CASCADE for org→projects→tasks→comments/attachments; RESTRICT for comment.author and activity.user to preserve audit.
- Migrations: `dotnet ef migrations add <Name> --project src/SaaSProjectManager.Infrastructure --startup-project src/SaaSProjectManager.API`
