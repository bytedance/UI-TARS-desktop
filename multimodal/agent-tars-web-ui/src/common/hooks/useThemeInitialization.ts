import { useEffect } from 'react';

/**
 * Custom hook for initializing and managing theme
 *
 * Handles:
 * - Theme initialization from localStorage
 * - Default to dark mode if no preference is set
 * - Listens for system theme changes when no explicit preference exists
 */
export const useThemeInitialization = () => {
  useEffect(() => {
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem('agent-tars-theme');

    // Apply theme - default to dark if not explicitly set to light
    if (storedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Either dark or null (not set) - use dark mode
      document.documentElement.classList.add('dark');
      if (!storedTheme) {
        localStorage.setItem('agent-tars-theme', 'dark');
      }
    }

    // Listen for theme preference changes - but only apply if user hasn't set a preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply system preference if no explicit user preference is stored
      if (localStorage.getItem('agent-tars-theme') === null) {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
};
