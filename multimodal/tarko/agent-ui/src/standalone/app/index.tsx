import React, { useMemo } from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import { extractActualBasename } from '@tarko/shared-utils';

export const AgentWebUI: React.FC = () => {
  useThemeInitialization();

  const isReplayMode = window.AGENT_REPLAY_MODE === true;
  console.log('isReplayMode', isReplayMode);

  const basename = useMemo(() => {
    if (isReplayMode) return undefined;
    
    const config = window.AGENT_WEB_UI_CONFIG;
    if (!config?.basePath) return '';
    
    // Extract actual basename from current URL using shared utility
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
