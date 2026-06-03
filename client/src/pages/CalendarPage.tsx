import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg, EventHoveringArg } from '@fullcalendar/core';
import { calendarApi } from '../api/calendar';
import { tasksApi } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import type { CalendarEvent, Task } from '../types';
import TaskFormModal from '../components/TaskFormModal';

// ── Calmer, product-grade color tokens ───────────────────────────────────────
const CHIP_STYLES: Record<string, { stripe: string; bg: string; text: string }> = {
  HIGH:     { stripe: '#f87171', bg: '#fef2f2', text: '#991b1b' }, // red-400 / red-50 / red-800
  MEDIUM:   { stripe: '#fbbf24', bg: '#fffbeb', text: '#92400e' }, // amber-400 / amber-50 / amber-800
  LOW:      { stripe: '#94a3b8', bg: '#f1f5f9', text: '#475569' }, // slate-400 / slate-100 / slate-600
  CAMPAIGN: { stripe: '#60a5fa', bg: '#eff6ff', text: '#1e40af' }, // blue-400 / blue-50 / blue-800
};

function chipStyle(event: CalendarEvent) {
  if (event.type === 'campaign') return CHIP_STYLES.CAMPAIGN;
  return CHIP_STYLES[event.priority ?? 'LOW'] ?? CHIP_STYLES.LOW;
}

const LEGEND = [
  { label: 'Campaign mail date', ...CHIP_STYLES.CAMPAIGN },
  { label: 'High priority',      ...CHIP_STYLES.HIGH     },
  { label: 'Medium priority',    ...CHIP_STYLES.MEDIUM   },
  { label: 'Low priority',       ...CHIP_STYLES.LOW      },
];

// ── Custom chip renderer (used by eventContent) ───────────────────────────────
function EventChip({ arg }: { arg: EventContentArg }) {
  const calEvent = arg.event.extendedProps as CalendarEvent;
  const { stripe, bg, text } = chipStyle(calEvent);

  return (
    <div
      title={arg.event.title}
      style={{
        borderLeftColor: stripe,
        backgroundColor: bg,
        color: text,
      }}
      className="cal-chip"
    >
      <span className="cal-chip-title">{arg.event.title}</span>
    </div>
  );
}

interface TooltipState {
  x: number;
  y: number;
  event: CalendarEvent;
}

type ModalState =
  | { mode: 'create'; date: string; campaignId: string }
  | { mode: 'edit'; task: Task };

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fetchingTask, setFetchingTask] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const activeCampaign = events.find((e) => e.type === 'campaign');
    if (!activeCampaign) return;
    setModal({ mode: 'create', date: arg.dateStr, campaignId: activeCampaign.resourceId });
  };

  const handleEventClick = async (arg: EventClickArg) => {
    const calEvent = arg.event.extendedProps as CalendarEvent;
    if (calEvent.type === 'campaign') return;

    setFetchingTask(true);
    try {
      const task = await tasksApi.get(calEvent.resourceId);
      setModal({ mode: 'edit', task });
    } catch {
      // task may have been deleted
    } finally {
      setFetchingTask(false);
    }
  };

  const handleEventMouseEnter = (arg: EventHoveringArg) => {
    const calEvent = arg.event.extendedProps as CalendarEvent;
    if (calEvent.type === 'campaign') return;
    const rect = (arg.el as HTMLElement).getBoundingClientRect();
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 4, event: calEvent });
  };

  const handleEventMouseLeave = () => {
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 150);
  };

  const handleSaved = () => {
    setModal(null);
    loadEvents();
  };

  const visibleEvents = assignedToMe && user
    ? events.filter((e) => e.type === 'campaign' || (e.ownerId === user.id && e.status !== 'COMPLETED'))
    : events;

  // Transparent background/border — all visual styling lives in EventChip
  const fcEvents = visibleEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.split('T')[0],
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: 'transparent',
    extendedProps: e,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <button
          onClick={() => setAssignedToMe((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
            assignedToMe
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-base leading-none">{assignedToMe ? '✓' : '○'}</span>
          Assigned to me
        </button>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading calendar…</div>}
      {error && <div className="text-center py-20 text-red-400">Failed to load events: {error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {/* Legend */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-4 text-xs flex-wrap">
              {LEGEND.map(({ label, stripe }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stripe }}
                  />
                  <span className="text-gray-500">{label}</span>
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

          {fcEvents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {assignedToMe ? 'No open tasks assigned to you.' : 'No events to display.'}
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={fcEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventMouseEnter={handleEventMouseEnter}
              eventMouseLeave={handleEventMouseLeave}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              height={700}
              eventDisplay="block"
              eventCursor="pointer"
              dayMaxEvents={3}
              eventContent={(arg) => <EventChip arg={arg} />}
            />
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg px-3 py-2 max-w-xs">
            <p className="font-medium truncate">{tooltip.event.title}</p>
            {tooltip.event.campaignName && (
              <p className="text-gray-300 mt-0.5">Campaign: {tooltip.event.campaignName}</p>
            )}
            {tooltip.event.assigneeName && (
              <p className="text-gray-300">Assignee: {tooltip.event.assigneeName}</p>
            )}
          </div>
        </div>
      )}

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
