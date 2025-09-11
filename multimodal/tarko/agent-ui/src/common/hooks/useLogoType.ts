import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

type LogoType = 'logo' | 'traffic-lights' | 'space';

const LOGO_STORAGE_KEY = 'ui-logo-type';

/**
 * Custom hook to manage logo type with URL parameter persistence
 * 
 * Features:
 * - Automatically persists logo parameter from URL to localStorage
 * - Provides current logo type with fallback chain: URL → localStorage → default
 * - Zero configuration required
 */
export const useLogoType = (): LogoType => {
  const location = useLocation();

  // Auto-persist URL parameter to localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const logoParam = params.get('logo');
    
    if (logoParam && ['logo', 'traffic-lights', 'space'].includes(logoParam)) {
      localStorage.setItem(LOGO_STORAGE_KEY, logoParam);
    }
  }, [location.search]);

  // Get current logo type with fallback chain
  const logoType = useMemo((): LogoType => {
    // Priority 1: URL parameter
    const urlParam = new URLSearchParams(location.search).get('logo');
    if (urlParam && ['logo', 'traffic-lights', 'space'].includes(urlParam)) {
      return urlParam as LogoType;
    }

    // Priority 2: localStorage
    const storedParam = localStorage.getItem(LOGO_STORAGE_KEY);
    if (storedParam && ['logo', 'traffic-lights', 'space'].includes(storedParam)) {
      return storedParam as LogoType;
    }

    // Priority 3: default
    return 'logo';
  }, [location.search]);

  return logoType;
};
