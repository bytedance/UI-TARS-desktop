import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '@/common/hooks/useSession';
import HomePage from '@/standalone/home/HomePage';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { SessionRouter } from './Router/SessionRouter';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';

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
      <Route 
        path="/" 
        element={
          <div className="flex flex-col h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <HomePage />
              </div>
            </div>
          </div>
        } 
      />
      <Route
        path="/:sessionId"
        element={
          <div className="flex flex-col h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            <Navbar />
            
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <SessionRouter>
                  <Layout />
                </SessionRouter>
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
};
