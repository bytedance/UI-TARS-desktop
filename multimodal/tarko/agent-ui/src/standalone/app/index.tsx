import React, { useMemo } from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';

export const AgentWebUI: React.FC = () => {
  useThemeInitialization();

  const isReplayMode = window.AGENT_REPLAY_MODE === true;
  console.log('isReplayMode', isReplayMode);
  
  const basename = useMemo(() => {
    if (isReplayMode) return undefined;
    return window.AGENT_WEB_UI_CONFIG?.basePath || '';
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
