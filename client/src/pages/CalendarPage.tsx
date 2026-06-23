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
  HIGH:     { stripe: '#f87171', bg: '#fef2f2', text: '#991b1b' },
  MEDIUM:   { stripe: '#fbbf24', bg: '#fffbeb', text: '#92400e' },
  LOW:      { stripe: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  CAMPAIGN: { stripe: '#60a5fa', bg: '#eff6ff', text: '#1e40af' },
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

// ── Custom chip renderer ──────────────────────────────────────────────────────
function EventChip({ arg }: { arg: EventContentArg }) {
  const calEvent = arg.event.extendedProps as CalendarEvent;
  const { stripe, bg, text } = chipStyle(calEvent);
  return (
    <div
      title={arg.event.title}
      style={{ borderLeftColor: stripe, backgroundColor: bg, color: text }}
      className="cal-chip"
    >
      <span className="cal-chip-title">{arg.event.title}</span>
    </div>
  );
}

interface TooltipState { x: number; y: number; event: CalendarEvent }

type ModalState =
  | { mode: 'create'; date: string; campaignId: string }
  | { mode: 'edit'; task: Task };

// ── Campaign multi-select filter ──────────────────────────────────────────────
interface CampaignOption { id: string; name: string }

function CampaignFilter({
  campaigns,
  selected,
  onChange,
}: {
  campaigns: CampaignOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = selected.size === 0 || selected.size === campaigns.length;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next.size === campaigns.length ? new Set() : next);
  };

  const label = allSelected
    ? 'All campaigns'
    : selected.size === 1
      ? (campaigns.find((c) => selected.has(c.id))?.name ?? '1 campaign')
      : `${selected.size} campaigns`;

  const Checkmark = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
          !allSelected
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
        </svg>
        <span className="max-w-[160px] truncate">{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1">
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
              {allSelected && <Checkmark />}
            </span>
            <span className={`font-medium ${allSelected ? 'text-blue-700' : 'text-gray-700'}`}>All campaigns</span>
          </button>

          {campaigns.length > 0 && <div className="border-t border-gray-100 my-1" />}

          <div className="max-h-56 overflow-y-auto">
            {campaigns.map((c) => {
              const checked = !allSelected && selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {checked && <Checkmark />}
                  </span>
                  <span className="truncate text-gray-700">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fetchingTask, setFetchingTask] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
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

  // Derive unique campaigns from loaded events (sorted alphabetically)
  const campaigns: CampaignOption[] = (() => {
    const seen = new Map<string, string>();
    for (const e of events) {
      if (e.campaignId && e.campaignName && !seen.has(e.campaignId)) {
        seen.set(e.campaignId, e.campaignName);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

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

  // Compose both filters
  const allCampaignsSelected = selectedCampaigns.size === 0;
  const visibleEvents = events.filter((e) => {
    if (!allCampaignsSelected) {
      const cid = e.type === 'campaign' ? e.resourceId : e.campaignId;
      if (!cid || !selectedCampaigns.has(cid)) return false;
    }
    if (assignedToMe && user) {
      if (e.type !== 'campaign' && (e.ownerId !== user.id || e.status === 'COMPLETED')) return false;
    }
    return true;
  });

  const fcEvents = visibleEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.split('T')[0],
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: 'transparent',
    extendedProps: e,
  }));

  const emptyMessage = (() => {
    if (assignedToMe && !allCampaignsSelected) return 'No open tasks assigned to you in the selected campaigns.';
    if (assignedToMe) return 'No open tasks assigned to you.';
    if (!allCampaignsSelected) return 'No events in the selected campaigns.';
    return 'No events to display.';
  })();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <CampaignFilter
            campaigns={campaigns}
            selected={selectedCampaigns}
            onChange={setSelectedCampaigns}
          />
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
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading calendar…</div>}
      {error && <div className="text-center py-20 text-red-400">Failed to load events: {error}</div>}

      {!loading && !error && (
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          style={{
            width: 'calc(100vw - 2rem)',
            marginLeft: 'calc(50% - 50vw + 1rem)',
          }}
        >
          {/* Legend */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-4 text-xs flex-wrap">
              {LEGEND.map(({ label, stripe }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stripe }} />
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
            <div className="text-center py-16 text-gray-400">{emptyMessage}</div>
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
