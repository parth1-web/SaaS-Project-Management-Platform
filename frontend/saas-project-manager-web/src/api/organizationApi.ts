import { axiosClient } from './axiosClient';
import type { Organization, OrganizationMember, PagedResult, ActivityLog } from '../types';

export const organizationApi = {
  list: async (page = 1, pageSize = 20) => {
    const res = await axiosClient.get<PagedResult<Organization>>('/api/organizations', { params: { page, pageSize } });
    return res.data;
  },
  get: async (id: string) => {
    const res = await axiosClient.get<Organization>(`/api/organizations/${id}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string }) => {
    const res = await axiosClient.post<Organization>('/api/organizations', data);
    return res.data;
  },
  update: async (id: string, data: { name: string; description?: string }) => {
    const res = await axiosClient.put<Organization>(`/api/organizations/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    await axiosClient.delete(`/api/organizations/${id}`);
  },
  members: async (id: string) => {
    const res = await axiosClient.get<OrganizationMember[]>(`/api/organizations/${id}/members`);
    return res.data;
  },
  addMember: async (id: string, data: { email: string; role: string }) => {
    const res = await axiosClient.post<OrganizationMember>(`/api/organizations/${id}/members`, data);
    return res.data;
  },
  updateRole: async (id: string, userId: string, role: string) => {
    const res = await axiosClient.put<OrganizationMember>(`/api/organizations/${id}/members/${userId}`, { role });
    return res.data;
  },
  removeMember: async (id: string, userId: string) => {
    await axiosClient.delete(`/api/organizations/${id}/members/${userId}`);
  },
  activity: async (id: string, page = 1, pageSize = 20) => {
    const res = await axiosClient.get<PagedResult<ActivityLog>>(`/api/organizations/${id}/activity`, { params: { page, pageSize } });
    return res.data;
  },
};
