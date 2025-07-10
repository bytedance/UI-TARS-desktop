import { useState, useEffect, useMemo } from 'react';
import { shareAPI, ApiShareItem } from '../services/api';
import { processShowcaseData, ProcessedShowcaseData, ShowcaseItem } from '../services/dataProcessor';

interface UseShowcaseDataResult {
  items: ShowcaseItem[];
  processedData: ProcessedShowcaseData | null;
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
  const [apiItems, setApiItems] = useState<ApiShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Process data only when apiItems change (performance optimization)
  const processedData = useMemo(() => {
    if (apiItems.length === 0) return null;
    return processShowcaseData(apiItems);
  }, [apiItems]);

  // Extract items for backward compatibility
  const items = processedData?.items || [];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (sessionId) {
        const response = await shareAPI.getShare(sessionId);

        if (response.success) {
          setApiItems([response.data]);
        } else {
          throw new Error(response.error || 'Failed to fetch share data');
        }
      } else if (slug) {
        const response = await shareAPI.getShareBySlug(slug);

        if (response.success) {
          setApiItems([response.data]);
        } else {
          throw new Error(response.error || `No share found with slug: ${slug}`);
        }
      } else {
        const response = await shareAPI.getPublicShares(1, 100);

        if (response.success) {
          setApiItems(response.data);
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
    processedData,
    isLoading,
    error,
    refetch: fetchData,
  };
}
