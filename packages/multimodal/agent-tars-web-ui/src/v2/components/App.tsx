import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '../hooks/useSession';

/**
 * Session Route Component - Handles session-specific routes
 */
const SessionRoute: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setActiveSession, connectionStatus, loadSessions } = useSession();

  // Set active session based on route parameter
  useEffect(() => {
    if (sessionId && connectionStatus.connected) {
      setActiveSession(sessionId).catch((error) => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
  }, [sessionId, connectionStatus.connected, setActiveSession]);

  return <Layout />;
};

/**
 * App Component - Main application container with routing
 *
 * Handles initialization of the application:
 * - Sets up connection monitoring
 * - Loads initial sessions list when connected
 * - Provides routing for session navigation
 */
export const App: React.FC = () => {
  const { initConnectionMonitoring, loadSessions, connectionStatus, activeSessionId } =
    useSession();
  const navigate = useNavigate();

  // Initialize connection monitoring and load sessions on mount
  useEffect(() => {
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
  }, [initConnectionMonitoring, loadSessions, connectionStatus.connected]);

  // // Update URL when active session changes
  // useEffect(() => {
  //   if (activeSessionId) {
  //     navigate(`/${activeSessionId}`, { replace: true });
  //   }
  // }, [activeSessionId, navigate]);

  return (
    <Routes>
      <Route path="/:sessionId" element={<SessionRoute />} />
      <Route path="/" element={<Layout />} />
    </Routes>
  );
};
