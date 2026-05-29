import client from './client';
import type { Task } from '../types';

export const tasksApi = {
  list: (campaignId?: string) =>
    client.get<Task[]>('/tasks', { params: campaignId ? { campaignId } : undefined }).then((r) => r.data),
  get: (id: string) => client.get<Task>(`/tasks/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<Task>) => client.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),
};
