import { atom } from 'jotai';
import { serverConnectionStatusAtom } from './sessionAtoms';
import { ApiService } from '../../services/api';

// Check server connection status
export const checkServerStatusAction = atom(null, async (get, set) => {
  const currentStatus = get(serverConnectionStatusAtom);

  try {
    const isConnected = await ApiService.checkServerStatus();

    set(serverConnectionStatusAtom, {
      ...currentStatus,
      connected: isConnected,
      lastConnected: isConnected ? Date.now() : currentStatus.lastConnected,
      lastError: isConnected ? null : currentStatus.lastError,
    });

    return isConnected;
  } catch (error) {
    set(serverConnectionStatusAtom, {
      ...currentStatus,
      connected: false,
      lastError: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
});

// Initialize connection status monitoring
export const initConnectionMonitoringAction = atom(null, (get, set) => {
  // Perform initial check
  set(checkServerStatusAction);

  // Set up socket event listeners
  const unsubscribe = ApiService.subscribeToConnectionStatus(
    // On connect
    () => {
      set(serverConnectionStatusAtom, (prev) => ({
        ...prev,
        connected: true,
        lastConnected: Date.now(),
        lastError: null,
        reconnecting: false,
      }));
    },
    // On disconnect
    (reason) => {
      set(serverConnectionStatusAtom, (prev) => ({
        ...prev,
        connected: false,
        lastError: `Disconnected: ${reason}`,
        reconnecting: true,
      }));
    },
    // On reconnecting
    () => {
      set(serverConnectionStatusAtom, (prev) => ({
        ...prev,
        reconnecting: true,
      }));
    },
    // On reconnect failed
    () => {
      set(serverConnectionStatusAtom, (prev) => ({
        ...prev,
        connected: false,
        reconnecting: false,
        lastError: 'Failed to reconnect after multiple attempts',
      }));
    },
  );

  // Set up periodic health checks
  const intervalId = setInterval(() => {
    set(checkServerStatusAction);
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    unsubscribe();
  };
});
