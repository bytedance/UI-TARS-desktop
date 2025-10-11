import { useState, useEffect, useMemo } from 'react';
import { shareAPI, ApiShareItem } from '../services/api';
import {
  processShowcaseData,
  ProcessedShowcaseData,
  ShowcaseItem,
} from '../services/dataProcessor';

// Import build-time data
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
 * Optimized showcase data hook that uses build-time injected data for public shares
 * and falls back to runtime API calls for specific sessionId/slug requests
 */
export function useShowcaseDataOptimized({
  sessionId,
  slug,
}: UseShowcaseDataProps = {}): UseShowcaseDataResult {
  const [apiItems, setApiItems] = useState<ApiShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use build-time data for public shares, runtime API for specific items
  const shouldUseBuildTimeData = !sessionId && !slug;

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

      if (shouldUseBuildTimeData) {
        // Use build-time injected data for public shares
        if (Array.isArray(showcaseData) && showcaseData.length > 0) {
          setApiItems(showcaseData);
          console.log('📦 Using build-time showcase data');
        } else {
          // Fallback to runtime API if build-time data is not available
          console.log('⚠️ Build-time data not available, falling back to runtime API');
          const response = await shareAPI.getPublicShares(1, 100);

          if (response.success) {
            setApiItems(response.data);
          } else {
            throw new Error(response.error || 'Failed to fetch showcase data');
          }
        }
      } else {
        // For specific sessionId/slug, always use runtime API
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
  }, [sessionId, slug, shouldUseBuildTimeData]);

  return {
    items,
    processedData,
    isLoading,
    error,
    refetch: fetchData,
  };
}
