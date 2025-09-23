import React, { useMemo } from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';

/**
 * Check if a path pattern contains regex characters
 */
function isRegexPattern(path: string): boolean {
  return /[.*+?^${}()|[\]\\]/.test(path);
}

/**
 * Extract the actual basename from current URL using the configured basePath pattern
 */
function extractActualBasename(basePath: string, currentPath: string): string {
  if (!basePath) return '';

  if (isRegexPattern(basePath)) {
    try {
      // Replace .+ with [^/]+ (non-greedy match)
      const extractPattern = basePath.replace(/\.\+/g, '[^/]+');
      const extractRegex = new RegExp(`^${extractPattern}`);
      const match = currentPath.match(extractRegex);

      return match ? match[0] : '';
    } catch (error) {
      console.warn('Invalid regex pattern in basePath:', basePath, error);
      return '';
    }
  } else {
    // Static path
    const normalized = basePath.replace(/\/$/, '');
    if (currentPath === normalized || currentPath.startsWith(normalized + '/')) {
      return normalized;
    }
    return '';
  }
}

export const AgentWebUI: React.FC = () => {
  useThemeInitialization();

  const isReplayMode = window.AGENT_REPLAY_MODE === true;
  console.log('isReplayMode', isReplayMode);

  const basename = useMemo(() => {
    if (isReplayMode) return undefined;

    const config = window.AGENT_WEB_UI_CONFIG;
    if (!config?.basePath) return '';

    // Extract actual basename from current URL
    const currentPath = window.location.pathname;
    const actualBasename = extractActualBasename(config.basePath, currentPath);

    console.log('basePath config:', config.basePath);
    console.log('current path:', currentPath);
    console.log('extracted basename:', actualBasename);

    return actualBasename;
  }, [isReplayMode]);

  const Router = isReplayMode ? HashRouter : BrowserRouter;

  return (
    <Provider>
      <ReplayModeProvider>
        <Router basename={basename}>
          <App />
        </Router>
      </ReplayModeProvider>
    </Provider>
  );
};
