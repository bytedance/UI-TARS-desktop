import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';

interface SessionRouterProps {
  children: React.ReactNode;
}

export const SessionRouter: React.FC<SessionRouterProps> = ({ children }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setActiveSession, sessions, connectionStatus, activeSessionId, sendMessage } =
    useSession();
  const { isReplayMode } = useReplayMode();
  const location = useLocation();

  const sessionExists = sessions.some((session) => session.id === sessionId);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');

    if (
      query &&
      sessionId &&
      activeSessionId === sessionId &&
      !location.pathname.includes('/welcome')
    ) {
      sendMessage(query).catch((error) => {
        console.error(`Failed to send query: ${error}`);
      });
    }
  }, [location.search, sessionId, activeSessionId, sendMessage, location.pathname]);

  useEffect(() => {
    if (isReplayMode) {
      console.log('[ReplayMode] SessionRouter: Skipping session setup in replay mode');
      return;
    }

    if (sessionId && sessionExists && connectionStatus.connected && activeSessionId !== sessionId) {
      console.log(
        `SessionRouter: Loading session ${sessionId} from URL (current active: ${activeSessionId})`,
      );

      setActiveSession(sessionId).catch((error) => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
  }, [
    sessionId,
    sessionExists,
    connectionStatus.connected,
    activeSessionId,
    setActiveSession,
    isReplayMode,
  ]);

  if (isReplayMode) {
    console.log('[ReplayMode] SessionRouter: Rendering children in replay mode');
    return <>{children}</>;
  }

  if (!sessionExists && sessions.length > 0 && sessionId && sessionId !== 'creating') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
