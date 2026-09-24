namespace SaaSProjectManager.Domain.Enums;

public enum OrganizationRole
{
    Owner = 0,
    Admin = 1,
    Manager = 2,
    Member = 3
}

public enum ProjectStatus
{
    Planning = 0,
    Active = 1,
    Completed = 2,
    Archived = 3
}

public enum TaskStatus
{
    Todo = 0,
    InProgress = 1,
    Review = 2,
    Completed = 3
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

public enum NotificationType
{
    TaskAssigned = 0,
    TaskStatusChanged = 1,
    CommentAdded = 2,
    Mention = 3,
    DeadlineReminder = 4,
    Invitation = 5,
    ProjectCreated = 6
}
