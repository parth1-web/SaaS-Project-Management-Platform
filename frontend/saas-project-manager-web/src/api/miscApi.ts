import { axiosClient } from './axiosClient';
import type { Attachment, DashboardStats, NotificationItem, PagedResult } from '../types';

export const notificationApi = {
  list: async (page = 1, pageSize = 20, unreadOnly = false) => {
    const res = await axiosClient.get<PagedResult<NotificationItem>>('/api/notifications', { params: { page, pageSize, unreadOnly } });
    return res.data;
  },
  unreadCount: async () => {
    const res = await axiosClient.get<{ unreadCount: number }>('/api/notifications/unread-count');
    return res.data.unreadCount;
  },
  markRead: async (id: string) => {
    await axiosClient.post(`/api/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await axiosClient.post('/api/notifications/read-all');
  },
};

export const dashboardApi = {
  stats: async (organizationId?: string) => {
    const res = await axiosClient.get<DashboardStats>('/api/dashboard', { params: { organizationId } });
    return res.data;
  },
};

export const demoApi = {
  seed: async () => {
    const res = await axiosClient.post<{ organizationId: string; seeded: boolean }>('/api/demo/seed');
    return res.data;
  },
};

export const attachmentApi = {
  list: async (taskId: string) => {
    const res = await axiosClient.get<Attachment[]>(`/api/tasks/${taskId}/attachments`);
    return res.data;
  },
  upload: async (taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await axiosClient.post<Attachment>(`/api/tasks/${taskId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  remove: async (id: string) => {
    await axiosClient.delete(`/api/attachments/${id}`);
  },
  downloadUrl: (id: string) => {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
    return `${base}/api/attachments/${id}/download`;
  },
};
