import { useState } from 'react';
import { useCampaignDetail } from '../hooks/useCampaignDetail';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignBoard from '../components/CampaignBoard';

export default function Dashboard() {
  const { campaigns, loading: loadingList } = useCampaigns();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? campaigns.find((c) => c.status === 'ACTIVE')?.id ?? campaigns[0]?.id ?? null;

  const { campaign, loading: loadingDetail, refresh } = useCampaignDetail(activeId ?? '');

  if (loadingList) {
    return <div className="text-center py-20 text-gray-400">Loading campaigns…</div>;
  }

  if (campaigns.length === 0) {
    return <div className="text-center py-20 text-gray-400">No campaigns found. Add one to get started.</div>;
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
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.name}
            <span className="ml-1.5 text-xs opacity-70">({c._count?.tasks ?? 0})</span>
          </button>
        ))}
      </div>

      {loadingDetail || !campaign ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : (
        <CampaignBoard campaign={campaign} onTaskUpdated={refresh} />
      )}
    </div>
  );
}
