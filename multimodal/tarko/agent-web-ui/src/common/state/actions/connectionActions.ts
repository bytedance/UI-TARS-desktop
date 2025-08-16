import { atom } from 'jotai';
import { SOCKET_EVENTS } from '@/common/constants';
import { apiService } from '@/common/services/apiService';
import { socketService } from '@/common/services/socketService';
import {
  connectionStatusAtom,
  agentInfoAtom,
  workspaceInfoAtom,
  agentOptionsAtom,
  modelInfoAtom,
} from '@/common/state/atoms/ui';

/**
 * Check server connection status
 */
export const checkConnectionStatusAction = atom(null, async (get, set) => {
  const currentStatus = get(connectionStatusAtom);

  try {
    const isConnected = await apiService.checkServerHealth();

    set(connectionStatusAtom, {
      ...currentStatus,
      connected: isConnected,
      lastConnected: isConnected ? Date.now() : currentStatus.lastConnected,
      lastError: isConnected ? null : currentStatus.lastError,
    });

    // Load agent info and workspace info when connection is successful
    if (isConnected) {
      try {
        const agentInfo = await apiService.getAgentInfo();
        set(agentInfoAtom, agentInfo);
      } catch (error) {
        console.warn('Failed to load agent info:', error);
      }

      try {
        const agentOptions = await apiService.getAgentOptions();
        set(agentOptionsAtom, agentOptions);

        // Extract workspace info from agent options
        const workspaceInfo = {
          name: agentOptions.workspaceName || 'Unknown',
          path: agentOptions.workspace || '',
        };
        set(workspaceInfoAtom, workspaceInfo);

        // Extract model info from agent options
        const modelInfo = {
          model: agentOptions.model?.id || agentOptions.model?.id,
          provider: agentOptions.model?.provider,
        };
        set(modelInfoAtom, modelInfo);
      } catch (error) {
        console.warn('Failed to load agent options:', error);
      }
    }

    return isConnected;
  } catch (error) {
    set(connectionStatusAtom, {
      ...currentStatus,
      connected: false,
      lastError: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
});

/**
 * Initialize connection monitoring
 */
export const initConnectionMonitoringAction = atom(null, (get, set) => {
  // Perform initial check
  set(checkConnectionStatusAction);

  // Connect to socket service
  socketService.connect();

  // Set up socket event listeners
  socketService.on(SOCKET_EVENTS.CONNECT, () => {
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: true,
      lastConnected: Date.now(),
      lastError: null,
      reconnecting: false,
    }));
  });

  socketService.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: false,
      lastError: `Disconnected: ${reason}`,
      reconnecting: true,
    }));
  });

  socketService.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, () => {
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      reconnecting: true,
    }));
  });

  socketService.on(SOCKET_EVENTS.RECONNECT_FAILED, () => {
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: false,
      reconnecting: false,
      lastError: 'Failed to reconnect after multiple attempts',
    }));
  });

  // Set up periodic health checks
  const intervalId = setInterval(() => {
    set(checkConnectionStatusAction);
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    socketService.off(SOCKET_EVENTS.CONNECT, () => {});
    socketService.off(SOCKET_EVENTS.DISCONNECT, () => {});
    socketService.off(SOCKET_EVENTS.RECONNECT_ATTEMPT, () => {});
    socketService.off(SOCKET_EVENTS.RECONNECT_FAILED, () => {});
  };
});
