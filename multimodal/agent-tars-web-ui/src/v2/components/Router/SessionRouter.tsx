import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useReplayMode } from '../../context/ReplayModeContext';

interface SessionRouterProps {
  children: React.ReactNode;
}

/**
 * SessionRouter Component - Handles session routing logic
 */
export const SessionRouter: React.FC<SessionRouterProps> = ({ children }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setActiveSession, sessions, connectionStatus, activeSessionId, sendMessage } =
    useSession();
  const isReplayMode = useReplayMode();
  const location = useLocation();

  // Check if session exists in our loaded sessions
  const sessionExists = sessions.some((session) => session.id === sessionId);

  // Handle query parameter if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');

    if (
      query &&
      sessionId &&
      activeSessionId === sessionId &&
      !location.pathname.includes('/welcome')
    ) {
      // Process the query
      sendMessage(query).catch((error) => {
        console.error(`Failed to send query: ${error}`);
      });
    }
  }, [location.search, sessionId, activeSessionId, sendMessage, location.pathname]);

  // Setup session - but skip in replay mode as it's handled by ReplayModeProvider
  useEffect(() => {
    // Skip this logic in replay mode since session is already set
    if (isReplayMode) {
      console.log('[ReplayMode] SessionRouter: Skipping session setup in replay mode');
      return;
    }

    // Only set active session if:
    // 1. We have a session ID from URL
    // 2. It exists in our sessions list
    // 3. We're connected
    if (sessionId && sessionExists && connectionStatus.connected) {
      console.log(`SessionRouter: Loading session ${sessionId} from URL`);

      setActiveSession(sessionId).catch((error) => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
  }, [sessionId, sessionExists, connectionStatus.connected, setActiveSession, isReplayMode]);

  // In replay mode, always show content regardless of session existence
  if (isReplayMode) {
    console.log('[ReplayMode] SessionRouter: Rendering children in replay mode');
    return <>{children}</>;
  }

  // For normal mode, redirect if session doesn't exist
  if (!sessionExists && sessions.length > 0 && sessionId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
