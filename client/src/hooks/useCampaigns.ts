import { useEffect, useState } from 'react';
import { campaignsApi } from '../api/campaigns';
import type { Campaign } from '../types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    campaignsApi
      .list()
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { campaigns, loading, error };
}
