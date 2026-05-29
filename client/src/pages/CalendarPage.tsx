import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { calendarApi } from '../api/calendar';
import type { CalendarEvent } from '../types';

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#dc2626',
  MEDIUM: '#d97706',
  LOW: '#6b7280',
};
const CAMPAIGN_COLOR = '#1e3a8a';

function eventColor(event: CalendarEvent): string {
  if (event.type === 'campaign') return CAMPAIGN_COLOR;
  return PRIORITY_COLOR[event.priority ?? 'LOW'] ?? PRIORITY_COLOR.LOW;
}

const LEGEND = [
  { label: 'Campaign mail date', color: CAMPAIGN_COLOR },
  { label: 'High priority task', color: PRIORITY_COLOR.HIGH },
  { label: 'Medium priority task', color: PRIORITY_COLOR.MEDIUM },
  { label: 'Low priority task', color: PRIORITY_COLOR.LOW },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calendarApi
      .events()
      .then(setEvents)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.split('T')[0],
    backgroundColor: eventColor(e),
    borderColor: eventColor(e),
    extendedProps: e,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>

      {loading && <div className="text-center py-20 text-gray-400">Loading calendar…</div>}

      {error && <div className="text-center py-20 text-red-400">Failed to load events: {error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="mb-4 flex gap-5 text-xs flex-wrap">
            {LEGEND.map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No events to display.</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={fcEvents}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              height="auto"
              eventDisplay="block"
            />
          )}
        </div>
      )}
    </div>
  );
}
