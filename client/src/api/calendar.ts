import client from './client';
import type { CalendarEvent } from '../types';

export const calendarApi = {
  events: () => client.get<CalendarEvent[]>('/calendar/events').then((r) => r.data),
};
