import client from './client';
import type { ChecklistTemplate } from '../types';

export interface TemplatePayload {
  name: string;
  description?: string;
  isActive?: boolean;
  items: {
    title: string;
    description?: string;
    sortOrder: number;
    defaultRole?: string;
    defaultDaysOffset?: number;
    priority?: string;
  }[];
}

export const campaignTemplatesApi = {
  list: () => client.get<ChecklistTemplate[]>('/campaign-templates').then((r) => r.data),
  get: (id: string) => client.get<ChecklistTemplate>(`/campaign-templates/${id}`).then((r) => r.data),
  create: (data: TemplatePayload) => client.post<ChecklistTemplate>('/campaign-templates', data).then((r) => r.data),
  update: (id: string, data: Partial<TemplatePayload>) =>
    client.patch<ChecklistTemplate>(`/campaign-templates/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/campaign-templates/${id}`),
};
