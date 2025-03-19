import { useState, useEffect } from 'react';
import { getAvailableProviders } from '../../../api/llmConfig';
import { ModelProvider } from '@agent-infra/shared';

export function useProviders() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const availableProviders =
          (await getAvailableProviders()) as ModelProvider[];
        setProviders(availableProviders);
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProviders();
  }, []);

  return { providers, loading };
}
