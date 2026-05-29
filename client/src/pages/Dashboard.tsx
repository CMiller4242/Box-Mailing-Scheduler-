import { useState } from 'react';
import { useCampaignDetail } from '../hooks/useCampaignDetail';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import CampaignBoard from '../components/CampaignBoard';
import TaskFormModal from '../components/TaskFormModal';
import type { CampaignWithTasks } from '../types';

function applyFilter(campaign: CampaignWithTasks, assignedToMe: boolean, myId: string): CampaignWithTasks {
  if (!assignedToMe) return campaign;
  return {
    ...campaign,
    tasks: campaign.tasks.filter(
      (t) => t.ownerId === myId && t.status !== 'COMPLETED',
    ),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { campaigns, loading: loadingList, error: listError } = useCampaigns();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);

  const activeId =
    selectedId ?? campaigns.find((c) => c.status === 'ACTIVE')?.id ?? campaigns[0]?.id ?? null;

  const { campaign, loading: loadingDetail, error: detailError, refresh } = useCampaignDetail(activeId);

  if (loadingList) {
    return <div className="text-center py-20 text-gray-400">Loading campaigns…</div>;
  }
  if (listError) {
    return <div className="text-center py-20 text-red-400">Failed to load campaigns: {listError}</div>;
  }
  if (campaigns.length === 0) {
    return <div className="text-center py-20 text-gray-400">No campaigns found. Add one to get started.</div>;
  }

  const filteredCampaign = campaign && user
    ? applyFilter(campaign, assignedToMe, user.id)
    : campaign;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 mr-2">Dashboard</h1>

        {/* Campaign tabs */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                c.id === activeId
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.name}
              <span className="ml-1.5 text-xs opacity-70">({c._count?.tasks ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Filters + CTA */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
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

          {activeId && (
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span className="text-base leading-none">+</span> New Task
            </button>
          )}
        </div>
      </div>

      {detailError && (
        <div className="mb-4 text-sm text-red-500">Failed to load campaign: {detailError}</div>
      )}

      {assignedToMe && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <span>Showing open tasks assigned to you</span>
          <button onClick={() => setAssignedToMe(false)} className="text-blue-400 hover:text-blue-600 text-xs">
            Clear
          </button>
        </div>
      )}

      {loadingDetail ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : filteredCampaign ? (
        <CampaignBoard campaign={filteredCampaign} onTaskUpdated={refresh} />
      ) : null}

      {showNewTask && activeId && (
        <TaskFormModal
          campaignId={activeId}
          onClose={() => setShowNewTask(false)}
          onSaved={() => { refresh(); setShowNewTask(false); }}
        />
      )}
    </div>
  );
}
