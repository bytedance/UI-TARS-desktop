import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';

interface SessionRouterProps {
  children: React.ReactNode;
}

/**
 * SessionRouter Component - Handles session routing logic
 * 
 * This component:
 * 1. Extracts session ID from the URL
 * 2. Loads the session if it exists
 * 3. Redirects to home if session doesn't exist or can't be loaded
 */
export const SessionRouter: React.FC<SessionRouterProps> = ({ children }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { 
    setActiveSession, 
    sessions, 
    connectionStatus,
    activeSessionId
  } = useSession();

  // Check if session exists in our loaded sessions
  const sessionExists = sessions.some(session => session.id === sessionId);

  useEffect(() => {
    // Only try to set active session if:
    // 1. We have a session ID from URL
    // 2. We're connected to the server
    // 3. The session exists in our list
    // 4. It's not already the active session
    if (
      sessionId && 
      connectionStatus.connected && 
      sessionExists && 
      sessionId !== activeSessionId
    ) {
      setActiveSession(sessionId).catch(error => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
  }, [sessionId, connectionStatus.connected, sessionExists, activeSessionId, setActiveSession]);

  // If the session doesn't exist and we've loaded sessions, redirect to home
  if (!sessionExists && sessions.length > 0 && sessionId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
