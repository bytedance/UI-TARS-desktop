import type { IpcRendererListener } from '@electron-toolkit/preload';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ErrorReporterMessage } from '@main/utils/errorReporter';

// Using closure to implement singleton pattern
const errorHandlerSingleton = (() => {
  let isSetup = false;
  let cleanupFunction: (() => void) | null = null;

  const setup = () => {
    // If already set up, return the existing cleanup function
    if (isSetup) {
      return cleanupFunction;
    }

    const handleMainProcessError: IpcRendererListener = (
      _event,
      errorData: ErrorReporterMessage,
    ) => {
      // Create a formatted message
      const formattedMessage = `${errorData.source}: ${errorData.message}`;

      // Show toast notification with enhanced styling
      toast.error(formattedMessage, {
        duration: 5000,
        position: 'top-right',
        style: {
          maxWidth: '500px',
          wordBreak: 'break-word',
          backgroundColor: '#FEE2E2', // Light red background
          color: '#B91C1C', // Deep red text
          padding: '12px 16px',
          fontWeight: '500',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #FECACA',
        },
      });

      // Also log to console for debugging
      console.error('[Main Process Error]', errorData);
    };

    console.log('setupMainProcessErrorHandler - registering event listener');

    // Add event listener
    window.electron.ipcRenderer.on('main:error', handleMainProcessError);

    // Set up cleanup function
    cleanupFunction = () => {
      if (isSetup) {
        console.log('setupMainProcessErrorHandler - removing event listener');
        window.electron.ipcRenderer.removeListener(
          'main:error',
          handleMainProcessError,
        );
        isSetup = false;
        cleanupFunction = null;
      }
    };

    // Mark as set up
    isSetup = true;

    return cleanupFunction;
  };

  return {
    setup,
    cleanup: () => cleanupFunction?.(),
    isSetup: () => isSetup,
  };
})();

/**
 * Sets up listeners for main process errors
 * This is now a singleton implementation
 */
export function setupMainProcessErrorHandler() {
  return errorHandlerSingleton.setup();
}

/**
 * React hook to use in components
 * Uses the singleton pattern to ensure only one listener exists
 */
export function useMainProcessErrorHandler() {
  useEffect(() => {
    // Use singleton pattern to set up event listener
    setupMainProcessErrorHandler();

    // Return cleanup function - but may not be needed in actual application
    // since this error handler should typically exist throughout the application lifecycle
    return () => {};
  }, []);
}
