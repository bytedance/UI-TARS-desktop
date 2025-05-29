import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '../hooks/useSession';
import HomePage from './Router/HomePage';

/**
 * Session Route Component - Handles session-specific routes
 */
const SessionRoute: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setActiveSession, connectionStatus, loadSessions } = useSession();
  const location = useLocation();
  
  // Set active session based on route parameter
  useEffect(() => {
    if (sessionId && connectionStatus.connected) {
      setActiveSession(sessionId).catch(error => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
  }, [sessionId, connectionStatus.connected, setActiveSession]);
  
  // Process query parameter if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');
    
    // If there's a query in the URL, process it
    if (query && sessionId) {
      // Remove the query parameter from the URL
      const navigate = useNavigate();
      navigate(`/${sessionId}`, { replace: true });
    }
  }, [location, sessionId]);
  
  return <Layout />;
};

/**
 * App Component - Main application container with routing
 */
export const App: React.FC = () => {
  const { 
    initConnectionMonitoring, 
    loadSessions, 
    connectionStatus
  } = useSession();
  
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

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:sessionId" element={<SessionRoute />} />
    </Routes>
  );
};
