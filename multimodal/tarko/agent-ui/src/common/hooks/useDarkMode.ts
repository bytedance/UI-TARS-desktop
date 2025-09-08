import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting and responding to dark mode changes
 *
 * This hook:
 * - Detects initial dark mode state from document class
 * - Listens for theme changes via MutationObserver
 * - Returns reactive isDarkMode state that updates when theme changes
 */
export const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from document class
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Create observer to watch for dark class changes on document element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newIsDarkMode = document.documentElement.classList.contains('dark');
          setIsDarkMode(newIsDarkMode);
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkMode;
};
