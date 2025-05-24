import React, { useEffect } from 'react';
import { Layout } from './Layout';
import { useSession } from '../hooks/useSession';

/**
 * App Component - Main application container
 *
 * Handles initialization of the application:
 * - Sets up connection monitoring
 * - Loads initial sessions list when connected
 */
export const App: React.FC = () => {
  const { initConnectionMonitoring, loadSessions, connectionStatus } = useSession();

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

  return <Layout />;
};
