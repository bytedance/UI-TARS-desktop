/**
 * Utility functions to simplify conditional rendering logic in Chat UI
 */

import { ConnectionStatus } from '@/common/types';
import { getAgentTitle, isContextualSelectorEnabled } from '@/common/constants';

/**
 * Determines if the input field should show as active/focused state
 */
export const getInputActiveState = (
  isFocused: boolean,
  hasInput: boolean,
  hasImages: boolean,
  hasContextualItems: boolean
): boolean => {
  return isFocused || hasInput || hasImages || hasContextualItems;
};

/**
 * Gets the appropriate placeholder text for the input field
 */
export const getInputPlaceholder = (
  connectionStatus?: ConnectionStatus,
  isProcessing?: boolean
): string => {
  if (connectionStatus && !connectionStatus.connected) {
    return 'Server disconnected...';
  }
  
  if (isProcessing) {
    return `${getAgentTitle()} is running...`;
  }
  
  const contextualEnabled = isContextualSelectorEnabled();
  const baseText = `Ask ${getAgentTitle()} something...`;
  
  if (contextualEnabled) {
    return `${baseText} (Use @ to reference files/folders, Ctrl+Enter to send)`;
  }
  
  return `${baseText} (Ctrl+Enter to send)`;
};

/**
 * Gets the appropriate status message for the bottom of the input
 */
export const getStatusMessage = (
  connectionStatus?: ConnectionStatus,
  isProcessing?: boolean
): {
  text: string;
  type: 'error' | 'processing' | 'normal';
} => {
  if (connectionStatus && !connectionStatus.connected) {
    return {
      text: connectionStatus.reconnecting
        ? 'Attempting to reconnect...'
        : 'Server disconnected. Click the button to reconnect.',
      type: 'error',
    };
  }
  
  if (isProcessing) {
    return {
      text: 'Agent is processing your request...',
      type: 'processing',
    };
  }
  
  const contextualEnabled = isContextualSelectorEnabled();
  return {
    text: contextualEnabled
      ? 'Use @ to reference files/folders • Ctrl+Enter to send • You can also paste images directly'
      : 'Use Ctrl+Enter to quickly send • You can also paste images directly',
    type: 'normal',
  };
};

/**
 * Determines if the submit button should be disabled
 */
export const isSubmitDisabled = (
  hasInput: boolean,
  hasImages: boolean,
  isDisabled: boolean
): boolean => {
  return (!hasInput && !hasImages) || isDisabled;
};

/**
 * Gets the appropriate CSS classes for the submit button
 */
export const getSubmitButtonClasses = (
  hasInput: boolean,
  hasImages: boolean,
  isDisabled: boolean
): string => {
  const baseClasses = 'absolute right-3 bottom-3 p-3 rounded-full transition-all duration-200';
  
  if (isSubmitDisabled(hasInput, hasImages, isDisabled)) {
    return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed`;
  }
  
  return `${baseClasses} bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 text-white dark:text-gray-900 shadow-sm`;
};

/**
 * Gets the appropriate CSS classes for the file upload button
 */
export const getFileButtonClasses = (isDisabled: boolean, isProcessing: boolean): string => {
  const baseClasses = 'p-2 rounded-full transition-colors';
  
  if (isDisabled || isProcessing) {
    return `${baseClasses} text-gray-300 dark:text-gray-600 cursor-not-allowed`;
  }
  
  return `${baseClasses} text-gray-400 hover:text-accent-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400`;
};

/**
 * Gets the appropriate CSS classes for the abort button
 */
export const getAbortButtonClasses = (isAborting: boolean): string => {
  const baseClasses = 'absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200';
  
  if (isAborting) {
    return `${baseClasses} text-gray-300 dark:text-gray-600 cursor-not-allowed`;
  }
  
  return `${baseClasses} text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400`;
};
