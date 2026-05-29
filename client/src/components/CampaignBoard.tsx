import { useState } from 'react';
import type { CampaignWithTasks, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import StatusBadge from './StatusBadge';
import TaskFormModal from './TaskFormModal';
import { useRole } from '../hooks/useRole';

interface Props {
  campaign: CampaignWithTasks;
  onTaskUpdated: () => void;
}

interface Column {
  status: TaskStatus;
  label: string;
  headerClass: string;
  bgClass: string;
  countClass: string;
}

const COLUMNS: Column[] = [
  {
    status: 'NOT_STARTED',
    label: 'Not Started',
    headerClass: 'text-slate-600',
    bgClass: 'bg-slate-50 border border-slate-200',
    countClass: 'bg-slate-200 text-slate-600',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    headerClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border border-blue-200',
    countClass: 'bg-blue-100 text-blue-600',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    headerClass: 'text-green-700',
    bgClass: 'bg-green-50 border border-green-200',
    countClass: 'bg-green-100 text-green-600',
  },
];

export default function CampaignBoard({ campaign, onTaskUpdated }: Props) {
  const mailDate = new Date(campaign.mailDate);
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const { canCreateTask } = useRole();

  return (
    <div className="mb-8">
      {/* Campaign header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
        <StatusBadge status={campaign.status} />
        <span className="text-sm text-gray-400 ml-auto">
          Mail date:{' '}
          <span className="font-medium text-gray-700">
            {mailDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </span>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(({ status, label, headerClass, bgClass, countClass }) => {
          const tasks = campaign.tasks.filter((t) => t.status === status);
          return (
            <div key={status} className={`rounded-xl p-3 ${bgClass}`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold ${headerClass}`}>{label}</span>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${countClass}`}>
                  {tasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No tasks</p>
                ) : (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdated={onTaskUpdated} />
                  ))
                )}
              </div>

              {/* Add task button — hidden for EMPLOYEE */}
              {canCreateTask && (
                <button
                  onClick={() => setCreating(status)}
                  className="mt-3 w-full text-xs text-gray-400 hover:text-blue-600 hover:bg-white/70 rounded-lg py-1.5 transition-colors border border-dashed border-gray-300 hover:border-blue-300"
                >
                  + Add task
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Task modal */}
      {creating && (
        <TaskFormModal
          campaignId={campaign.id}
          defaultDate={new Date().toISOString().split('T')[0]}
          onClose={() => setCreating(null)}
          onSaved={() => { onTaskUpdated(); setCreating(null); }}
        />
      )}
    </div>
  );
}
