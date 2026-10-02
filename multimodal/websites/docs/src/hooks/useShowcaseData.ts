import { useCallback, useMemo } from 'react';
import { showcaseShares } from '../data/showcaseShares';
import {
  processShowcaseData,
  ProcessedShowcaseData,
  ShowcaseItem,
} from '../services/dataProcessor';
import type { ApiShareItem } from '../shared/types';

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
 * `extractIdFromPath` tells slugs and sessionIds apart by looking for a dash, so a
 * sessionId containing one arrives here labelled as a slug. Matching either field
 * keeps those links resolvable.
 */
function findShare(id: string): ApiShareItem | undefined {
  return showcaseShares.find((share) => share.slug === id || share.sessionId === id);
}

/**
 * Showcase data hook backed by the committed snapshot: resolving a list, a
 * sessionId or a slug never touches the network, so the pages survive the share
 * API being down. Unknown ids yield an empty result, which callers render as 404.
 */
export function useShowcaseData({
  sessionId,
  slug,
}: UseShowcaseDataProps = {}): UseShowcaseDataResult {
  const id = sessionId || slug || null;

  const apiItems = useMemo(() => {
    if (!id) return showcaseShares;
    const match = findShare(id);
    return match ? [match] : [];
  }, [id]);

  const processedData = useMemo(
    () => (apiItems.length > 0 ? processShowcaseData(apiItems) : null),
    [apiItems],
  );

  // Part of the hook's contract for the retry buttons; the snapshot is bundled, so
  // there is nothing left to fetch.
  const refetch = useCallback(async () => {}, []);

  return {
    items: processedData?.items || [],
    processedData,
    isLoading: false,
    error: null,
    refetch,
  };
}
