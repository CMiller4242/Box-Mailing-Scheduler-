import client from './client';
import type { Task, TaskAttachment } from '../types';

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
  update: (id: string, data: Partial<CreateTaskPayload & { status: Task['status'] }>) =>
    client.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/tasks/${id}`).then((r) => r.data),
  complete: (id: string, nextOwnerId?: string) =>
    client.post<{ completed: string; next: string | null }>(`/tasks/${id}/complete`, { nextOwnerId }).then((r) => r.data),

  // Attachments
  getAttachments: (taskId: string) =>
    client.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`).then((r) => r.data),
  uploadAttachment: (taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<TaskAttachment>(`/tasks/${taskId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  downloadAttachmentUrl: (attachmentId: string) =>
    `${client.defaults.baseURL}/tasks/attachments/${attachmentId}/download`,
  deleteAttachment: (attachmentId: string) =>
    client.delete(`/tasks/attachments/${attachmentId}`).then((r) => r.data),
  markSentToSalesEnablement: (attachmentId: string) =>
    client.patch<TaskAttachment>(`/tasks/attachments/${attachmentId}/sales-enablement`).then((r) => r.data),
};
