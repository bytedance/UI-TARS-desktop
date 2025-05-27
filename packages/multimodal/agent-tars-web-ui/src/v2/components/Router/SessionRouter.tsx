import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';

interface SessionRouterProps {
  children: React.ReactNode;
}

/**
 * SessionRouter Component - Handles session routing logic
 * 
 * 简化逻辑，仅在首次加载时设置活动会话，避免循环更新
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

  // 只在组件挂载时设置一次活动会话，不随依赖项变化而重新执行
  useEffect(() => {
    // Only set active session if:
    // 1. We have a session ID from URL
    // 2. It exists in our sessions list 
    // 3. We're connected
    if (sessionId && sessionExists && connectionStatus.connected) {
      console.log(`SessionRouter: Loading session ${sessionId} from URL`);
      
      setActiveSession(sessionId).catch(error => {
        console.error(`Failed to load session ${sessionId}:`, error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // If the session doesn't exist and we've loaded sessions, redirect to home
  if (!sessionExists && sessions.length > 0 && sessionId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
