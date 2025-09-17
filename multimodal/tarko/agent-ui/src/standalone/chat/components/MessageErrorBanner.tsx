import React from 'react';
import { useAtom } from 'jotai';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { messageErrorAtom } from '@/common/state/atoms/ui';

export const MessageErrorBanner: React.FC = () => {
  const [messageError, setMessageError] = useAtom(messageErrorAtom);

  if (!messageError) {
    return null;
  }

  const handleDismiss = () => {
    setMessageError(null);
  };

  return (
    <div className="mx-5 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex-shrink-0 mt-0.5">
        <FiAlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800 dark:text-red-200">
          <span className="font-medium">Failed to send message:</span> {messageError}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded transition-colors"
        aria-label="Dismiss error"
      >
        <FiX className="w-4 h-4 text-red-600 dark:text-red-400" />
      </button>
    </div>
  );
};
