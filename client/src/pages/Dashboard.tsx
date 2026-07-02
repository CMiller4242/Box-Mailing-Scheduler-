import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { campaignsApi } from '../api/campaigns';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useUsers } from '../hooks/useUsers';
import type { CampaignWithTasks, Task, TaskStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import TaskFormModal from '../components/TaskFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { tasksApi } from '../api/tasks';

const STATUS_ORDER: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

// Soft accent palette — 8 distinct tints, professional and restrained
const ACCENTS = [
  { border: '#3b82f6', bg: '#eff6ff' }, // blue
  { border: '#8b5cf6', bg: '#f5f3ff' }, // violet
  { border: '#14b8a6', bg: '#f0fdfa' }, // teal
  { border: '#f59e0b', bg: '#fffbeb' }, // amber
  { border: '#6366f1', bg: '#eef2ff' }, // indigo
  { border: '#10b981', bg: '#ecfdf5' }, // emerald
  { border: '#f43f5e', bg: '#fff1f2' }, // rose
  { border: '#0ea5e9', bg: '#f0f9ff' }, // sky
];

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-600',
    ACTIVE:    'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.DRAFT}`}>
      {status}
    </span>
  );
}

interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canDelete: boolean;
}

function TaskRow({ task, onEdit, onDelete, canDelete }: TaskRowProps) {
  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status !== 'COMPLETED';

  return (
    <div
      onClick={() => onEdit(task)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
    >
      <div className="w-24 flex-shrink-0">
        <StatusBadge status={task.status} />
      </div>
      <p className="flex-1 text-sm text-gray-800 truncate">{task.title}</p>
      <div className="flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>
      <span className={`text-xs flex-shrink-0 w-24 text-right ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
        {dueDate.toLocaleDateString()}
      </span>
      {task.owner && (
        <span className="text-xs text-gray-400 flex-shrink-0 w-28 truncate text-right hidden md:block">
          {task.owner.name}
        </span>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(task); }}
          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
          aria-label="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface AccordionItemProps {
  campaign: CampaignWithTasks;
  accentBorder: string;
  accentBg: string;
  showCompleted: boolean;
  assignedToMe: boolean;
  assignedToTeam: boolean;
  myId: string;
  teamMemberIds: string[];
  canCreate: boolean;
  canDelete: boolean;
  onRefresh: () => void;
  onDeleteCampaign: (c: CampaignWithTasks) => void;
}

function CampaignAccordionItem({
  campaign, accentBorder, accentBg,
  showCompleted, assignedToMe, assignedToTeam, myId, teamMemberIds, canCreate, canDelete, onRefresh, onDeleteCampaign,
}: AccordionItemProps) {
  const [open, setOpen] = useState(campaign.status === 'ACTIVE');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  let tasks = campaign.tasks;
  if (assignedToMe)   tasks = tasks.filter((t) => t.ownerId === myId);
  if (assignedToTeam) tasks = tasks.filter((t) => t.ownerId != null && teamMemberIds.includes(t.ownerId));
  if (!showCompleted) tasks = tasks.filter((t) => t.status !== 'COMPLETED');
  tasks = [...tasks].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  const totalCount = campaign.tasks.length;
  const completedCount = campaign.tasks.filter((t) => t.status === 'COMPLETED').length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDeleteConfirm = async () => {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      await tasksApi.remove(deleteTask.id);
      toast.success('Task deleted');
      onRefresh();
      setDeleteTask(null);
    } catch {
      toast.error('Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: accentBorder, borderLeftWidth: '4px' }}
    >
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors text-left"
        style={{ backgroundColor: open ? accentBg : undefined }}
      >
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{campaign.name}</span>
            <CampaignStatusBadge status={campaign.status} />
            <span className="text-xs text-gray-400">
              Mail: {new Date(campaign.mailDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: accentBorder }}
              />
            </div>
            <span className="text-xs text-gray-400">{completedCount}/{totalCount}</span>
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{tasks.length} shown</span>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditTask({} as Task); }}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-white text-xs font-medium rounded-md transition-colors"
            style={{ backgroundColor: accentBorder }}
          >
            + Task
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteCampaign(campaign); }}
            className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1"
            aria-label="Delete campaign"
            title="Delete campaign"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </button>

      {/* Task list */}
      {open && (
        <div className="border-t border-gray-100">
          {tasks.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-6">
              {assignedToMe ? 'No tasks assigned to you here.' : assignedToTeam ? 'No team tasks here.' : 'No tasks to show.'}
            </div>
          ) : (
            tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onEdit={setEditTask}
                onDelete={setDeleteTask}
                canDelete={canDelete}
              />
            ))
          )}
        </div>
      )}

      {/* Edit/Create task modal */}
      {editTask && (
        editTask.id
          ? <TaskFormModal task={editTask} onClose={() => setEditTask(null)} onSaved={() => { onRefresh(); setEditTask(null); }} />
          : <TaskFormModal campaignId={campaign.id} onClose={() => setEditTask(null)} onSaved={() => { onRefresh(); setEditTask(null); }} />
      )}

      {/* Delete task confirm */}
      <ConfirmDialog
        open={!!deleteTask}
        title="Delete task?"
        description={`"${deleteTask?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete task"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTask(null)}
      />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { canCreateTask, canDeleteTask, isManager } = useRole();
  const allUsers = useUsers();
  const [campaigns, setCampaigns] = useState<CampaignWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [assignedToTeam, setAssignedToTeam] = useState(false);

  // Delete campaign state
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<CampaignWithTasks | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

  const load = useCallback(() => {
    return campaignsApi.withTasks()
      .then(setCampaigns)
      .catch(() => setError('Failed to load campaigns. Please refresh.'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleDeleteCampaignConfirm = async () => {
    if (!deleteCampaignTarget) return;
    setDeletingCampaign(true);
    try {
      await campaignsApi.remove(deleteCampaignTarget.id);
      toast.success(`"${deleteCampaignTarget.name}" deleted`);
      setDeleteCampaignTarget(null);
      load();
    } catch {
      toast.error('Failed to delete campaign.');
    } finally {
      setDeletingCampaign(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading campaigns…</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;

  const myId = user?.id ?? '';

  // Team member IDs for the "Assigned to Team" filter (managers only)
  const teamMemberIds = isManager
    ? allUsers.filter((u) => u.managerId === myId).map((u) => u.id)
    : [];

  const visibleCampaigns = campaigns.filter((c) => {
    if (!showCompleted && c.status === 'COMPLETED') return false;
    if (assignedToMe) {
      const mine = c.tasks.filter((t) => t.ownerId === myId);
      const visibleMine = showCompleted ? mine : mine.filter((t) => t.status !== 'COMPLETED');
      return visibleMine.length > 0;
    }
    if (assignedToTeam) {
      const teamTasks = c.tasks.filter((t) => t.ownerId != null && teamMemberIds.includes(t.ownerId));
      const visibleTeam = showCompleted ? teamTasks : teamTasks.filter((t) => t.status !== 'COMPLETED');
      return visibleTeam.length > 0;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Dashboard</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showCompleted
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showCompleted ? 'Hide' : 'Show'} completed
          </button>

          <button
            onClick={() => { setAssignedToMe((v) => !v); setAssignedToTeam(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              assignedToMe
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Assigned to me
          </button>

          {isManager && (
            <button
              onClick={() => { setAssignedToTeam((v) => !v); setAssignedToMe(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                assignedToTeam
                  ? 'bg-violet-50 border-violet-300 text-violet-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Assigned to team
            </button>
          )}
        </div>
      </div>

      {visibleCampaigns.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          {assignedToMe
            ? 'No campaigns with tasks assigned to you.'
            : assignedToTeam
              ? 'No campaigns with tasks assigned to your team.'
              : 'No campaigns to display.'}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visibleCampaigns.map((c, idx) => {
          const accent = ACCENTS[idx % ACCENTS.length];
          return (
            <CampaignAccordionItem
              key={c.id}
              campaign={c}
              accentBorder={accent.border}
              accentBg={accent.bg}
              showCompleted={showCompleted}
              assignedToMe={assignedToMe}
              assignedToTeam={assignedToTeam}
              myId={myId}
              teamMemberIds={teamMemberIds}
              canCreate={canCreateTask}
              canDelete={canDeleteTask}
              onRefresh={load}
              onDeleteCampaign={setDeleteCampaignTarget}
            />
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteCampaignTarget}
        title={`Delete "${deleteCampaignTarget?.name}"?`}
        description="This campaign and all its tasks will be permanently deleted. This cannot be undone."
        confirmLabel="Delete campaign"
        loading={deletingCampaign}
        onConfirm={handleDeleteCampaignConfirm}
        onCancel={() => { if (!deletingCampaign) setDeleteCampaignTarget(null); }}
      />
    </div>
  );
}
