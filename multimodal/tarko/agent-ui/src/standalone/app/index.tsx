import React from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';

export const AgentWebUI: React.FC = () => {
  useThemeInitialization();

  const isReplayMode = window.AGENT_REPLAY_MODE === true;
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
