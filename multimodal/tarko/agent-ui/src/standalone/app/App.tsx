import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useSession } from '@/common/hooks/useSession';
import HomePage from '@/standalone/home/HomePage';
import CreatingPage from '@/standalone/home/CreatingPage';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { SessionRouter } from './Router/SessionRouter';
import { Sidebar } from '@/standalone/sidebar';
import { Navbar } from '@/standalone/navbar';
import { isSidebarEnabled, isHomeEnabled } from '@/config/web-ui-config';
import { McpDashboard } from '@/standalone/mcp/McpDashboard';
import { McpServerDetail } from '@/standalone/mcp/McpServerDetail';

export const App: React.FC = () => {
  const { initConnectionMonitoring, loadSessions, connectionStatus, activeSessionId } =
    useSession();
  const { isReplayMode } = useReplayMode();
  const sidebarEnabled = isSidebarEnabled();
  const homeEnabled = isHomeEnabled();

  useEffect(() => {
    if (isReplayMode) {
      console.log('[ReplayMode] Skipping connection initialization in replay mode');
      return;
    }

    const initialize = async () => {
      const cleanup = initConnectionMonitoring();
      // Load sessions after connection monitoring is initialized
      // The connection monitoring will handle loading sessions when connected
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
  }, [initConnectionMonitoring, isReplayMode]);

  if (isReplayMode) {
    console.log('[ReplayMode] Rendering replay layout directly');
    return (
      <div className="flex h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
        {sidebarEnabled && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <Layout isReplayMode={true} />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {homeEnabled && (
        <Route
          path="/"
          element={
            <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100">
              {sidebarEnabled && <Sidebar />}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <HomePage />
                </div>
              </div>
            </div>
          }
        />
      )}
      {homeEnabled && (
        <Route
          path="/creating"
          element={
            <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100">
              {sidebarEnabled && <Sidebar />}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <CreatingPage />
                </div>
              </div>
            </div>
          }
        />
      )}
      <Route
        path="/mcp"
        element={
          <div className="flex h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {sidebarEnabled && <Sidebar />}
            <div className="flex-1 flex flex-col overflow-hidden">
              <McpDashboard />
            </div>
          </div>
        }
      />
      <Route
        path="/mcp/:serverName"
        element={
          <div className="flex h-screen bg-[#F2F3F5] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {sidebarEnabled && <Sidebar />}
            <div className="flex-1 flex flex-col overflow-hidden">
              <McpServerDetail />
            </div>
          </div>
        }
      />
      <Route
        path="/:sessionId"
        element={
          <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            {sidebarEnabled && <Sidebar />}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <SessionRouter>
                <Layout />
              </SessionRouter>
            </div>
          </div>
        }
      />
    </Routes>
  );
};
