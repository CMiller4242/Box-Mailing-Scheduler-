import client from './client';
import type { User, UserRole } from '../types';

export const usersApi = {
  list: () => client.get<User[]>('/users').then((r) => r.data),
  updateRole: (id: string, role: UserRole) =>
    client.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),
  updateManager: (id: string, managerId: string | null) =>
    client.patch<User>(`/users/${id}/manager`, { managerId }).then((r) => r.data),
  deleteUser: (id: string) =>
    client.delete<{ id: string }>(`/users/${id}`).then((r) => r.data),
};
