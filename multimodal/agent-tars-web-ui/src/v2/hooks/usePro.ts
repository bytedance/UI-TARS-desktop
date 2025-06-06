import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Hook to check if pro mode is enabled via URL parameter
 *
 * Pro mode enables additional features like replay and plan buttons
 */
export function usePro(): boolean {
  const location = useLocation();

  return useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.has('pro');
  }, [location.search]);
}
