import { axiosClient } from './axiosClient';
import type { AuthResponse, User } from '../types';

export const authApi = {
  register: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const res = await axiosClient.post<AuthResponse>('/api/auth/register', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await axiosClient.post<AuthResponse>('/api/auth/login', data);
    return res.data;
  },
  me: async () => {
    const res = await axiosClient.get<User>('/api/auth/me');
    return res.data;
  },
  logout: async (refreshToken: string) => {
    await axiosClient.post('/api/auth/logout', { refreshToken });
  },
};
