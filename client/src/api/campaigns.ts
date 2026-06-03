import client from './client';
import type { Campaign, CampaignWithTasks } from '../types';

export const campaignsApi = {
  list: () => client.get<Campaign[]>('/campaigns').then((r) => r.data),
  get: (id: string) => client.get<CampaignWithTasks>(`/campaigns/${id}`).then((r) => r.data),
  withTasks: () => client.get<CampaignWithTasks[]>('/campaigns/with-tasks').then((r) => r.data),
  create: (data: Partial<Campaign>) => client.post<Campaign>('/campaigns', data).then((r) => r.data),
  update: (id: string, data: Partial<Campaign>) => client.patch<Campaign>(`/campaigns/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/campaigns/${id}`),
  applyTemplate: (campaignId: string, templateId: string, clearExisting = false) =>
    client.post<{ applied: number }>(`/campaigns/${campaignId}/apply-template`, { templateId, clearExisting }).then((r) => r.data),
};
