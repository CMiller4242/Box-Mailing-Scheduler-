import { useCallback, useEffect, useState } from 'react';
import { campaignsApi } from '../api/campaigns';
import type { CampaignWithTasks } from '../types';

export function useCampaignDetail(id: string | null) {
  const [campaign, setCampaign] = useState<CampaignWithTasks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    campaignsApi
      .get(id)
      .then(setCampaign)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setCampaign(null);
    refresh();
  }, [refresh]);

  return { campaign, loading, error, refresh };
}
