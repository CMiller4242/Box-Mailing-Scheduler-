import { useState } from 'react';
import type { Task } from '../types';
import { tasksApi } from '../api/tasks';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import TaskDetailModal from './TaskDetailModal';

interface Props {
  task: Task;
  onUpdated: () => void;
}

export default function TaskCard({ task, onUpdated }: Props) {
  const [open, setOpen] = useState(false);

  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status !== 'COMPLETED';

  return (
    <>
      <div
        className={`bg-white rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <StatusBadge status={task.status} />
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            Due {dueDate.toLocaleDateString()}
          </span>
        </div>
        {task.owner && (
          <p className="mt-1 text-xs text-gray-400 truncate">👤 {task.owner.name}</p>
        )}
      </div>
      {open && (
        <TaskDetailModal
          task={task}
          onClose={() => setOpen(false)}
          onUpdated={() => { onUpdated(); setOpen(false); }}
        />
      )}
    </>
  );
}
