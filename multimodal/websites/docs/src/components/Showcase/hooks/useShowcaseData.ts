import { useState, useEffect } from 'react';
import { shareAPI } from '../services/api';
import { adaptApiItemToShowcase, ShowcaseItem } from '../adapters/dataAdapter';

interface UseShowcaseDataResult {
  items: ShowcaseItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseShowcaseDataProps {
  sessionId?: string | null;
  slug?: string | null;
}

export function useShowcaseData({
  sessionId,
  slug,
}: UseShowcaseDataProps = {}): UseShowcaseDataResult {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (sessionId) {
        const response = await shareAPI.getShare(sessionId);

        if (response.success) {
          const adaptedItem = adaptApiItemToShowcase(response.data);
          setItems([adaptedItem]);
        } else {
          throw new Error(response.error || 'Failed to fetch share data');
        }
      } else if (slug) {
        const response = await shareAPI.getShareBySlug(slug);

        if (response.success) {
          const adaptedItem = adaptApiItemToShowcase(response.data);
          setItems([adaptedItem]);
        } else {
          throw new Error(response.error || `No share found with slug: ${slug}`);
        }
      } else {
        const response = await shareAPI.getPublicShares(1, 100);

        if (response.success) {
          const adaptedItems = response.data.map(adaptApiItemToShowcase);
          setItems(adaptedItems);
        } else {
          throw new Error(response.error || 'Failed to fetch showcase data');
        }
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
  }, [sessionId, slug]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchData,
  };
}
