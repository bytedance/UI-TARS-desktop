import React from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';


export const AgentWebUI: React.FC = () => {
  // Initialize theme based on user preference, defaulting to dark mode
  useThemeInitialization();

  // Use HashRouter for shared HTML files (replay mode) to prevent routing issues
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
