import client from './client';
import type { User, UserRole } from '../types';

export const usersApi = {
  list: () => client.get<User[]>('/users').then((r) => r.data),
  updateRole: (id: string, role: UserRole) =>
    client.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),
};
