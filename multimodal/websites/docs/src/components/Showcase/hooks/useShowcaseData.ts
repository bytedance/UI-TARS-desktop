import { useState, useEffect } from 'react';
import { shareAPI } from '../services/api';
import { adaptApiItemToShowcase, ShowcaseItem } from '../adapters/dataAdapter';

interface UseShowcaseDataResult {
  items: ShowcaseItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShowcaseData(): UseShowcaseDataResult {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await shareAPI.getShares(1, 100);
      
      if (response.success) {
        const adaptedItems = response.data.map(adaptApiItemToShowcase);
        setItems(adaptedItems);
      } else {
        throw new Error(response.error || 'Failed to fetch showcase data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch showcase data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    items,
    isLoading,
    error,
    refetch: fetchData,
  };
}
