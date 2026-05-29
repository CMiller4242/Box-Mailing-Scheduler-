import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { calendarApi } from '../api/calendar';
import type { CalendarEvent } from '../types';

function eventColor(event: CalendarEvent): string {
  if (event.type === 'campaign') return '#1e3a8a';
  const priorityColors: Record<string, string> = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#4b5563' };
  return priorityColors[event.priority ?? 'LOW'] ?? '#4b5563';
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calendarApi
      .events()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: typeof e.date === 'string' ? e.date.split('T')[0] : e.date,
    backgroundColor: eventColor(e),
    borderColor: eventColor(e),
    extendedProps: e,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading calendar…</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="mb-4 flex gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#1e3a8a' }} />
              Campaign mail date
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              High priority task
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
              Medium priority task
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
              Low priority task
            </span>
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={fcEvents}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
            height="auto"
            eventDisplay="block"
          />
        </div>
      )}
    </div>
  );
}
