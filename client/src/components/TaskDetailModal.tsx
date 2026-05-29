import { useState } from 'react';
import type { Task, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks';
import { useUsers } from '../hooks/useUsers';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function TaskDetailModal({ task, onClose, onUpdated }: Props) {
  const users = useUsers();
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [ownerId, setOwnerId] = useState<string>(task.ownerId ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = status !== task.status || ownerId !== (task.ownerId ?? '');

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await tasksApi.update(task.id, {
        status,
        ownerId: ownerId || undefined,
      });
      onUpdated();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 leading-snug pr-4">{task.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          {task.instructions && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {task.instructions}
            </div>
          )}

          <div className="text-sm text-gray-500 mb-4">
            <span className="font-medium">Due:</span>{' '}
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          <div className="space-y-4 border-t pt-4">
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

            {saveError && (
              <p className="text-sm text-red-500">{saveError}</p>
            )}

            {isDirty && (
              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
