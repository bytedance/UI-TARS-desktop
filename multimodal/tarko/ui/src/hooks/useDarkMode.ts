import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting and responding to dark mode changes
 */
export const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newIsDarkMode = document.documentElement.classList.contains('dark');
          setIsDarkMode(newIsDarkMode);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkMode;
};
