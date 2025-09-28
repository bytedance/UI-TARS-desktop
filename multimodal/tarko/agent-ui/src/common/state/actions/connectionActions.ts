import { atom } from 'jotai';
import { apiService } from '@/common/services/apiService';
import { connectionStatusAtom, agentOptionsAtom } from '@/common/state/atoms/ui';

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

    // Load agent options on successful connection
    if (isConnected) {
      try {
        const options = await apiService.getAgentOptions();
        set(agentOptionsAtom, options);
      } catch (error) {
        console.error('Failed to load agent options:', error);
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
