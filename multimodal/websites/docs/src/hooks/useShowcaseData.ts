import { useState, useEffect, useMemo } from 'react';
import { shareAPI, ApiShareItem } from '../services/api';
import {
  processShowcaseData,
  ProcessedShowcaseData,
  ShowcaseItem,
} from '../services/dataProcessor';
import { showcaseData } from 'showcase-data';

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

/**
 * Showcase data hook using build-time data for public shares
 */
export function useShowcaseData({
  sessionId,
  slug,
}: UseShowcaseDataProps = {}): UseShowcaseDataResult {
  const [apiItems, setApiItems] = useState<ApiShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processedData = useMemo(() => {
    if (apiItems.length === 0) return null;
    return processShowcaseData(apiItems);
  }, [apiItems]);

  const items = processedData?.items || [];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!sessionId && !slug) {
        // Use build-time data for public shares
        setApiItems(showcaseData.length > 0 ? showcaseData : await shareAPI.getPublicShares(1, 100).then(r => r.data));
      } else if (sessionId) {
        const response = await shareAPI.getShare(sessionId);
        setApiItems(response.success ? [response.data] : []);
      } else if (slug) {
        const response = await shareAPI.getShareBySlug(slug);
        setApiItems(response.success ? [response.data] : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
