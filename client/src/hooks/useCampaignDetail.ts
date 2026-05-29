import { useEffect, useState } from 'react';
import { campaignsApi } from '../api/campaigns';
import type { CampaignWithTasks } from '../types';

export function useCampaignDetail(id: string) {
  const [campaign, setCampaign] = useState<CampaignWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    campaignsApi
      .get(id)
      .then(setCampaign)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [id]);

  return { campaign, loading, error, refresh };
}
