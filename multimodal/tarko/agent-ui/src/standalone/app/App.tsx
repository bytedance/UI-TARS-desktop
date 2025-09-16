import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '@/common/hooks/useSession';
import HomePage from '@/standalone/home/HomePage';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { SessionRouter } from './Router/SessionRouter';

export const App: React.FC = () => {
  const { initConnectionMonitoring, loadSessions, connectionStatus, activeSessionId } =
    useSession();
  const { isReplayMode } = useReplayMode();

  useEffect(() => {
    if (isReplayMode) {
      console.log('[ReplayMode] Skipping connection initialization in replay mode');
      return;
    }

    const initialize = async () => {
      const cleanup = initConnectionMonitoring();

      if (connectionStatus.connected) {
        await loadSessions();
      }

      return cleanup;
    };

    const cleanupPromise = initialize();

    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [initConnectionMonitoring, loadSessions, connectionStatus.connected, isReplayMode]);

  if (isReplayMode) {
    console.log('[ReplayMode] Rendering replay layout directly');
    return <Layout isReplayMode={true} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/:sessionId"
        element={
          <SessionRouter>
            <Layout />
          </SessionRouter>
        }
      />
    </Routes>
  );
};
