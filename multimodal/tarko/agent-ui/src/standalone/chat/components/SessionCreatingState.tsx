import React from 'react';
import { FiLoader } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Enhanced loading state with clear loading indication
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
  if (!isCreating) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-full animate-in fade-in duration-600">
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Enhanced loading icon with refined glow */}
        <div className="relative mb-8 animate-in zoom-in duration-700">
          {/* Refined background glow - multiple layers for elegance */}
          <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-blue-500/10 blur-2xl animate-pulse" />
          <div
            className="absolute inset-2 w-28 h-28 mx-auto rounded-full bg-blue-400/15 blur-xl animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />

          {/* Main loading container with subtle pulse */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm animate-pulse">
            {/* Clean loading spinner */}
            <div className="relative z-10">
              <div className="text-blue-600 dark:text-blue-400 animate-spin">
                <FiLoader size={32} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced title with loading emphasis */}
        <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight animate-in slide-in-from-bottom-6 fade-in duration-600 delay-200">
          Preparing your session
        </h2>

        {/* More engaging description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed animate-in slide-in-from-bottom-6 fade-in duration-600 delay-400">
          Setting up your Agent workspace with care...
        </p>

        {/* Enhanced progress indicator */}
        <div className="flex items-center justify-center animate-in fade-in duration-600 delay-600">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
