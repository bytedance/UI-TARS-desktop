import React, { useEffect } from 'react';
import { Provider } from 'jotai';
import { App } from './components/App';

/**
 * Agent TARS Web UI v2 - Entry Component
 *
 * Provides the Jotai atom provider and initializes theme based on user preference.
 */
export const AgentTARSWebUI: React.FC = () => {
  // Initialize theme based on user preference
  useEffect(() => {
    // Check if user prefers dark mode
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem('agent-tars-theme');
    
    // Apply dark mode if preferred or stored
    if (storedTheme === 'dark' || (storedTheme === null && prefersDarkMode)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Listen for theme preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (storedTheme === null) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return (
    <Provider>
      <App />
    </Provider>
  );
};
