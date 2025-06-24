import React from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { HashRouter, BrowserRouter } from 'react-router-dom';

/**
 * Agent TARS Web UI v2 - Entry Component
 *
 * Provides the Jotai atom provider and initializes theme based on user preference.
 * Uses the enhanced ReplayModeProvider that now handles both context provision and initialization.
 */
export const AgentTARSWebUI: React.FC = () => {
  // Initialize theme based on user preference, defaulting to dark mode
  React.useEffect(() => {
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

  // Use HashRouter for shared HTML files (replay mode) to prevent routing issues
  const isReplayMode = window.AGENT_TARS_REPLAY_MODE === true;
  console.log('isReplayMode', isReplayMode);
  const Router = isReplayMode ? HashRouter : BrowserRouter;

  return (
    <Provider>
      <ReplayModeProvider>
        <Router>
          <App />
        </Router>
      </ReplayModeProvider>
    </Provider>
  );
};
