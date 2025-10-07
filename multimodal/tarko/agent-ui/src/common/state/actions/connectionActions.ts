import { atom } from 'jotai';
import { apiService } from '@/common/services/apiService';
import { connectionStatusAtom, agentOptionsAtom } from '@/common/state/atoms/ui';
import { sessionsAtom } from '@/common/state/atoms/session';

/**
 * Check server connection status
 */
export const checkConnectionStatusAction = atom(null, async (get, set) => {
  const currentStatus = get(connectionStatusAtom);
  const wasConnected = currentStatus.connected;

  try {
    const isConnected = await apiService.checkServerHealth();
    const isNewConnection = !wasConnected && isConnected;

    set(connectionStatusAtom, {
      ...currentStatus,
      connected: isConnected,
      lastConnected: isConnected ? Date.now() : currentStatus.lastConnected,
      lastError: isConnected ? null : currentStatus.lastError,
    });

    // Load data based on connection state
    if (isConnected) {
      try {
        if (isNewConnection) {
          // Load both options and sessions on initial connection or reconnection
          const [options, sessions] = await Promise.all([
            apiService.getAgentOptions(),
            apiService.getSessions()
          ]);
          set(agentOptionsAtom, options);
          set(sessionsAtom, sessions);
        } else {
          // For periodic health checks when already connected, only update agent options
          // Skip sessions reload to prevent unnecessary API calls
          const options = await apiService.getAgentOptions();
          set(agentOptionsAtom, options);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        set(agentOptionsAtom, {});
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

  // Set up periodic health checks
  const intervalId = setInterval(() => {
    set(checkConnectionStatusAction);
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
});
