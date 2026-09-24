import { axiosClient } from './axiosClient';
import type { PagedResult, Project } from '../types';

export const projectApi = {
  list: async (organizationId?: string, page = 1, pageSize = 20) => {
    const res = await axiosClient.get<PagedResult<Project>>('/api/projects', { params: { organizationId, page, pageSize } });
    return res.data;
  },
  get: async (id: string) => {
    const res = await axiosClient.get<Project>(`/api/projects/${id}`);
    return res.data;
  },
  create: async (data: { organizationId: string; name: string; description?: string; status: number; startDate?: string; endDate?: string }) => {
    const res = await axiosClient.post<Project>('/api/projects', data);
    return res.data;
  },
  update: async (id: string, data: { name: string; description?: string; status: number; startDate?: string; endDate?: string }) => {
    const res = await axiosClient.put<Project>(`/api/projects/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    await axiosClient.delete(`/api/projects/${id}`);
  },
  members: async (id: string) => {
    const res = await axiosClient.get(`/api/projects/${id}/members`);
    return res.data as { userId: string; email: string; fullName: string; joinedAt: string }[];
  },
  addMember: async (id: string, email: string) => {
    const res = await axiosClient.post(`/api/projects/${id}/members`, { email });
    return res.data;
  },
  removeMember: async (id: string, userId: string) => {
    await axiosClient.delete(`/api/projects/${id}/members/${userId}`);
  },
};
