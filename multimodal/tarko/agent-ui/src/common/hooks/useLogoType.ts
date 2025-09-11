import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

type LogoType = 'logo' | 'traffic-lights' | 'space';

export const useLogoType = (): LogoType => {
  const location = useLocation();

  useEffect(() => {
    const logoParam = new URLSearchParams(location.search).get('logo');
    if (logoParam) localStorage.setItem('ui-logo-type', logoParam);
  }, [location.search]);

  return useMemo(() => {
    const urlParam = new URLSearchParams(location.search).get('logo');
    const storedParam = localStorage.getItem('ui-logo-type');
    const param = urlParam || storedParam;
    
    return ['traffic-lights', 'space'].includes(param!) ? param as LogoType : 'logo';
  }, [location.search]);
};
