import { useState } from 'react';
import { useCampaignDetail } from '../hooks/useCampaignDetail';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignBoard from '../components/CampaignBoard';

export default function Dashboard() {
  const { campaigns, loading: loadingList, error: listError } = useCampaigns();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? campaigns.find((c) => c.status === 'ACTIVE')?.id ?? campaigns[0]?.id ?? null;

  const { campaign, loading: loadingDetail, error: detailError, refresh } = useCampaignDetail(activeId);

  if (loadingList) {
    return <div className="text-center py-20 text-gray-400">Loading campaigns…</div>;
  }

  if (listError) {
    return (
      <div className="text-center py-20 text-red-400">
        Failed to load campaigns: {listError}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        No campaigns found. Add one to get started.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 mr-2">Dashboard</h1>
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              c.id === activeId
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.name}
            <span className="ml-1.5 text-xs opacity-70">({c._count?.tasks ?? 0})</span>
          </button>
        ))}
      </div>

      {detailError && (
        <div className="mb-4 text-sm text-red-500">Failed to load campaign: {detailError}</div>
      )}

      {loadingDetail ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : campaign ? (
        <CampaignBoard campaign={campaign} onTaskUpdated={refresh} />
      ) : null}
    </div>
  );
}
