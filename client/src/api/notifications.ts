import client from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  list: () => client.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => client.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.patch('/notifications/read-all').then((r) => r.data),
  remove: (id: string) => client.delete(`/notifications/${id}`).then((r) => r.data),
};
