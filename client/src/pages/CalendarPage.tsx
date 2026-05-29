import { useCallback, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { calendarApi } from '../api/calendar';
import { tasksApi } from '../api/tasks';
import type { CalendarEvent, Task } from '../types';
import TaskFormModal from '../components/TaskFormModal';

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

type ModalState =
  | { mode: 'create'; date: string; campaignId: string }
  | { mode: 'edit'; task: Task };

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fetchingTask, setFetchingTask] = useState(false);

  const loadEvents = useCallback(() => {
    return calendarApi
      .events()
      .then(setEvents)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load events'));
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const handleDateClick = (arg: DateClickArg) => {
    // Find the first campaign to associate new tasks with. If multiple
    // campaigns exist the user can change it inside TaskFormModal in a future
    // iteration — for now we pick the first active one.
    const activeCampaign = events.find((e) => e.type === 'campaign');
    if (!activeCampaign) return; // no campaigns yet — nothing to attach to
    setModal({ mode: 'create', date: arg.dateStr, campaignId: activeCampaign.resourceId });
  };

  const handleEventClick = async (arg: EventClickArg) => {
    const calEvent = arg.event.extendedProps as CalendarEvent;
    if (calEvent.type === 'campaign') return; // campaigns are not editable here

    setFetchingTask(true);
    try {
      const task = await tasksApi.get(calEvent.resourceId);
      setModal({ mode: 'edit', task });
    } catch {
      // silently ignore — task may have been deleted
    } finally {
      setFetchingTask(false);
    }
  };

  const handleSaved = () => {
    setModal(null);
    loadEvents();
  };

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.split('T')[0],
    backgroundColor: eventColor(e),
    borderColor: eventColor(e),
    extendedProps: e,
    cursor: e.type === 'task' ? 'pointer' : 'default',
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>

      {loading && <div className="text-center py-20 text-gray-400">Loading calendar…</div>}
      {error && <div className="text-center py-20 text-red-400">Failed to load events: {error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {/* Legend + hint */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-5 text-xs flex-wrap">
              {LEGEND.map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-400 italic">
              Click a date to add a task · Click a task to edit
            </span>
          </div>

          {fetchingTask && (
            <div className="text-center text-sm text-gray-400 py-2">Loading task…</div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No events to display.</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={fcEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              height="auto"
              eventDisplay="block"
              eventCursor="pointer"
            />
          )}
        </div>
      )}

      {/* Task form modal */}
      {modal?.mode === 'create' && (
        <TaskFormModal
          campaignId={modal.campaignId}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.mode === 'edit' && (
        <TaskFormModal
          task={modal.task}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
