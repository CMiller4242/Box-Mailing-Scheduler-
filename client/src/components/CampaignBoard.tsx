import type { CampaignWithTasks, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import StatusBadge from './StatusBadge';

interface Props {
  campaign: CampaignWithTasks;
  onTaskUpdated: () => void;
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'NOT_STARTED', label: 'Not Started' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

export default function CampaignBoard({ campaign, onTaskUpdated }: Props) {
  const mailDate = new Date(campaign.mailDate);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
        <StatusBadge status={campaign.status} />
        <span className="text-sm text-gray-400 ml-auto">
          Mail date: <span className="font-medium text-gray-700">{mailDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(({ status, label }) => {
          const tasks = campaign.tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="bg-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">{label}</span>
                <span className="bg-white text-gray-500 text-xs font-medium rounded-full px-2 py-0.5">{tasks.length}</span>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                ) : (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdated={onTaskUpdated} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
