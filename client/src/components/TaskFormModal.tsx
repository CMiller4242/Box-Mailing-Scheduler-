import { useEffect, useRef, useState } from 'react';
import type { Task, TaskStatus, Priority } from '../types';
import { tasksApi } from '../api/tasks';
import { useUsers } from '../hooks/useUsers';

interface Props {
  /** Present → edit mode. Absent → create mode. */
  task?: Task;
  /** Required in create mode. */
  campaignId?: string;
  /** Pre-fill dueDate in create mode (YYYY-MM-DD). */
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

function toDateInput(iso: string) {
  return iso.split('T')[0];
}

export default function TaskFormModal({ task, campaignId, defaultDate, onClose, onSaved }: Props) {
  const isEdit = !!task;
  const users = useUsers();
  const firstRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task ? toDateInput(task.dueDate) : (defaultDate ?? ''));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'NOT_STARTED');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'MEDIUM');
  const [ownerId, setOwnerId] = useState(task?.ownerId ?? '');
  const [instructions, setInstructions] = useState(task?.instructions ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
    if (!dueDate) return 'Due date is required.';
    if (!isEdit && !campaignId) return 'Campaign is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        dueDate: new Date(dueDate).toISOString(),
        status,
        priority,
        ownerId: ownerId || undefined,
        instructions: instructions.trim() || undefined,
      };

      if (isEdit) {
        await tasksApi.update(task!.id, payload);
      } else {
        await tasksApi.create({ campaignId: campaignId!, ...payload });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to happen?"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Due date + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status + Assignee row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Notes</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Optional context, steps, or requirements…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
