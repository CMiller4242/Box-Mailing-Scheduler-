import client from './client';
import type { Task } from '../types';

export interface CreateTaskPayload {
  campaignId: string;
  title: string;
  dueDate: string;
  status?: Task['status'];
  priority?: Task['priority'];
  ownerId?: string;
  instructions?: string;
  reminderDateTime?: string;
}

export const tasksApi = {
  list: (campaignId?: string) =>
    client.get<Task[]>('/tasks', { params: campaignId ? { campaignId } : undefined }).then((r) => r.data),
  get: (id: string) => client.get<Task>(`/tasks/${id}`).then((r) => r.data),
  create: (data: CreateTaskPayload) => client.post<Task>('/tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateTaskPayload>) =>
    client.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),
};
