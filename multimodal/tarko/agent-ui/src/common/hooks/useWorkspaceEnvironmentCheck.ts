import { useEffect, useState } from 'react';
import { useSession } from './useSession';
import { apiService } from '../services/apiService';

/**
 * Hook to check if the current session's workspace differs from the server's current workspace
 * Returns warning state when there's a mismatch, indicating the session is in preview-only mode
 */
export function useWorkspaceEnvironmentCheck() {
  const { activeSessionId, sessions } = useSession();
  const [isWorkspaceMismatch, setIsWorkspaceMismatch] = useState(false);
  const [sessionWorkspace, setSessionWorkspace] = useState<string>('');
  const [serverWorkspace, setServerWorkspace] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeSessionId) {
      setIsWorkspaceMismatch(false);
      setSessionWorkspace('');
      setServerWorkspace('');
      return;
    }

    const checkWorkspaceEnvironment = async () => {
      try {
        setLoading(true);

        // Get current session's workspace
        const currentSession = sessions.find(session => session.id === activeSessionId);
        if (!currentSession) {
          setIsWorkspaceMismatch(false);
          return;
        }

        const sessionWorkspacePath = currentSession.workspace;

        // Get server's current workspace
        const serverWorkspaceInfo = await apiService.getWorkspaceInfo();
        const serverWorkspacePath = serverWorkspaceInfo.path;

        setSessionWorkspace(sessionWorkspacePath);
        setServerWorkspace(serverWorkspacePath);

        // Check if workspaces match
        const mismatch = sessionWorkspacePath !== serverWorkspacePath;
        setIsWorkspaceMismatch(mismatch);

        if (mismatch) {
          console.warn('Workspace environment mismatch detected:', {
            sessionWorkspace: sessionWorkspacePath,
            serverWorkspace: serverWorkspacePath,
          });
        }
      } catch (error) {
        console.error('Failed to check workspace environment:', error);
        // On error, assume no mismatch to avoid false positives
        setIsWorkspaceMismatch(false);
      } finally {
        setLoading(false);
      }
    };

    checkWorkspaceEnvironment();
  }, [activeSessionId, sessions]);

  return {
    isWorkspaceMismatch,
    sessionWorkspace,
    serverWorkspace,
    loading,
  };
}