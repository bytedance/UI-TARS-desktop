import React, { useMemo } from 'react';
import { Provider } from 'jotai';
import { App } from './App';
import { ReplayModeProvider } from '@/common/hooks/useReplayMode';
import { useThemeInitialization } from '@/common/hooks/useThemeInitialization';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import { getWebUIRouteBase } from '@/config/web-ui-config';
import { AuthProvider, createAuthHeaders, getCurrentUser } from '@/common/hooks/useAuth';

const old_fetch = window.fetch;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const userinfo = getCurrentUser();

  if (!init) {
    init = {};
  }

  if (!init.headers) {
    init.headers = {};
  }

  init.headers = {
    ...init.headers,
    ...createAuthHeaders(userinfo),
  };

  return old_fetch.apply(window, [input, init]);
};

export const AgentWebUI: React.FC = () => {
  useThemeInitialization();

  const isReplayMode = window.AGENT_REPLAY_MODE === true;
  console.log('isReplayMode', isReplayMode);
  const Router = isReplayMode ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <Provider>
        <ReplayModeProvider>
          <Router basename={getWebUIRouteBase()}>
            <App />
          </Router>
        </ReplayModeProvider>
      </Provider>
    </AuthProvider>
  );
};
