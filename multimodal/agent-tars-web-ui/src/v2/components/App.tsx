import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '../hooks/useSession';
import HomePage from './Router/HomePage';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '../state/atoms/replay';
import { useReplayMode } from '../context/ReplayModeContext';
import { SessionRouter } from './Router/SessionRouter';

/**
 * App Component - Main application container with routing
 */
export const App: React.FC = () => {
  const { initConnectionMonitoring, loadSessions, connectionStatus, activeSessionId } =
    useSession();
  const isReplayMode = useReplayMode();

  // Initialize connection monitoring and load sessions on mount - but not in replay mode
  useEffect(() => {
    // In replay mode, skip connection monitoring and session loading
    if (isReplayMode) {
      console.log('[ReplayMode] Skipping connection initialization in replay mode');
      return;
    }

    const initialize = async () => {
      // Initialize connection monitoring
      const cleanup = initConnectionMonitoring();

      // Load sessions if connected
      if (connectionStatus.connected) {
        await loadSessions();
      }

      return cleanup;
    };

    const cleanupPromise = initialize();

    // Cleanup on unmount
    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [initConnectionMonitoring, loadSessions, connectionStatus.connected, isReplayMode]);

  // Special handling for replay mode - bypass normal routing
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
