import { useState, useEffect } from 'react';
import { getAvailableProviders } from '../../../api/llmConfig';
import { Provider } from './types';

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const availableProviders =
          (await getAvailableProviders()) as Provider[];
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
