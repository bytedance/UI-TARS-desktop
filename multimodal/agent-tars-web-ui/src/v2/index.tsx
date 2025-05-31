import React from 'react';
import { Provider } from 'jotai';
import { App } from './components/App';
import { ReplayModeProvider } from './context/ReplayModeContext';
import { HashRouter, BrowserRouter } from 'react-router-dom';

/**
 * Agent TARS Web UI v2 - Entry Component
 *
 * Provides the Jotai atom provider and initializes theme based on user preference.
 * Uses the enhanced ReplayModeProvider that now handles both context provision and initialization.
 */
export const AgentTARSWebUI: React.FC = () => {
  // Initialize theme based on user preference
  React.useEffect(() => {
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
