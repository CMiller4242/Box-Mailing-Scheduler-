import { useState } from 'react';
import type { Task } from '../types';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import TaskFormModal from './TaskFormModal';
import { useRole } from '../hooks/useRole';
import { tasksApi } from '../api/tasks';

interface Props {
  task: Task;
  onUpdated: () => void;
}

export default function TaskCard({ task, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { canDeleteTask } = useRole();

  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status !== 'COMPLETED';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await tasksApi.remove(task.id);
      onUpdated();
    } catch {
      alert('Failed to delete task. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg border p-3.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
          isOverdue ? 'border-red-300' : 'border-gray-200'
        }`}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{task.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityBadge priority={task.priority} />
            {canDeleteTask && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                aria-label="Delete task"
                title="Delete task"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <StatusBadge status={task.status} />
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            Due {dueDate.toLocaleDateString()}
          </span>
        </div>
        {task.owner && (
          <p className="mt-1.5 text-xs text-gray-400 truncate">👤 {task.owner.name}</p>
        )}
        {task.instructions && (
          <p className="mt-1.5 text-xs text-gray-400 line-clamp-1 italic">{task.instructions}</p>
        )}
      </div>

      {open && (
        <TaskFormModal
          task={task}
          onClose={() => setOpen(false)}
          onSaved={() => { onUpdated(); setOpen(false); }}
        />
      )}
    </>
  );
}
