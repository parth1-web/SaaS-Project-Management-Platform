import { axiosClient } from './axiosClient';
import type { Comment, PagedResult, TaskItem } from '../types';

export const taskApi = {
  list: async (projectId: string, params?: { status?: string; priority?: string; assignee?: string; search?: string; page?: number; pageSize?: number }) => {
    const res = await axiosClient.get<PagedResult<TaskItem>>(`/api/projects/${projectId}/tasks`, { params });
    return res.data;
  },
  search: async (params?: { search?: string; status?: string; priority?: string; assignee?: string; projectId?: string; page?: number; pageSize?: number }) => {
    const res = await axiosClient.get<PagedResult<TaskItem>>('/api/tasks/search', { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await axiosClient.get<TaskItem>(`/api/tasks/${id}`);
    return res.data;
  },
  create: async (projectId: string, data: { title: string; description?: string; priority: number; dueDate?: string; assignedTo?: string }) => {
    const res = await axiosClient.post<TaskItem>(`/api/projects/${projectId}/tasks`, data);
    return res.data;
  },
  update: async (id: string, data: { title: string; description?: string; priority: number; dueDate?: string; assignedTo?: string; status: number }) => {
    const res = await axiosClient.put<TaskItem>(`/api/tasks/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    await axiosClient.delete(`/api/tasks/${id}`);
  },
  updateStatus: async (id: string, status: number) => {
    const res = await axiosClient.patch<TaskItem>(`/api/tasks/${id}/status`, { status });
    return res.data;
  },
  assign: async (id: string, assignedTo?: string) => {
    const res = await axiosClient.patch<TaskItem>(`/api/tasks/${id}/assignment`, { assignedTo });
    return res.data;
  },
};

export const commentApi = {
  list: async (taskId: string, page = 1, pageSize = 20) => {
    const res = await axiosClient.get<PagedResult<Comment>>(`/api/tasks/${taskId}/comments`, { params: { page, pageSize } });
    return res.data;
  },
  create: async (taskId: string, content: string) => {
    const res = await axiosClient.post<Comment>(`/api/tasks/${taskId}/comments`, { content });
    return res.data;
  },
  update: async (id: string, content: string) => {
    const res = await axiosClient.put<Comment>(`/api/comments/${id}`, { content });
    return res.data;
  },
  remove: async (id: string) => {
    await axiosClient.delete(`/api/comments/${id}`);
  },
};
