export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  fullName: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  memberCount: number;
  projectCount: number;
  userRole: string;
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  description?: string;
  status: number;
  startDate?: string;
  endDate?: string;
  taskCount: number;
  completedTasks: number;
  memberCount: number;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  status: number;
  priority: number;
  dueDate?: string;
  createdBy: string;
  createdByName?: string;
  assignedTo?: string;
  assigneeName?: string;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: number;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalOrganizations: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const TaskStatusLabels = ['Todo', 'InProgress', 'Review', 'Completed'];
export const TaskPriorityLabels = ['Low', 'Medium', 'High', 'Urgent'];
export const ProjectStatusLabels = ['Planning', 'Active', 'Completed', 'Archived'];
