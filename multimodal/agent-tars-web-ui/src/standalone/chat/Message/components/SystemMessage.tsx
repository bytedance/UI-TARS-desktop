import React from 'react';
import { motion } from 'framer-motion';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiRefreshCw, FiExternalLink } from 'react-icons/fi';

interface SystemMessageProps {
  content: string;
  level?: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
  timestamp?: number;
}

/**
 * Enhanced SystemMessage Component - displays system messages with appropriate styling based on severity
 * 
 * Design principles:
 * - Visual differentiation based on message level (info, warning, error)
 * - Clear iconography and color coding
 * - Expandable details for technical information
 * - Action buttons for common error scenarios
 */
export const SystemMessage: React.FC<SystemMessageProps> = ({ 
  content, 
  level = 'info',
  details,
  timestamp 
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  // Get styling based on error level
  const getMessageStyling = () => {
    switch (level) {
      case 'error':
        return {
          container: 'bg-red-50/80 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/40',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400',
          IconComponent: FiAlertCircle
        };
      case 'warning':
        return {
          container: 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40',
          text: 'text-amber-800 dark:text-amber-200',
          icon: 'text-amber-600 dark:text-amber-400',
          IconComponent: FiAlertTriangle
        };
      default:
        return {
          container: 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/40',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600 dark:text-blue-400',
          IconComponent: FiInfo
        };
    }
  };

  const styling = getMessageStyling();
  const { IconComponent } = styling;

  // Parse common error types for better UX
  const getErrorActions = () => {
    if (level !== 'error' || !details?.error) return null;

    const errorMsg = details.error.toLowerCase();
    
    // API Rate limit errors
    if (errorMsg.includes('rate limit') || errorMsg.includes('rpm') || errorMsg.includes('429')) {
      return (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-75">Suggestion:</span>
            <span>Wait a moment before trying again</span>
          </div>
        </div>
      );
    }

    // Network/Connection errors
    if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('timeout')) {
      return (
        <div className="mt-3 pt-3 border-t border-current/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-current/10 hover:bg-current/20 transition-colors"
            onClick={() => window.location.reload()}
          >
            <FiRefreshCw size={12} />
            Refresh Page
          </motion.button>
        </div>
      );
    }

    return null;
  };

  // Format error message for better readability
  const formatErrorMessage = (message: string) => {
    // Extract readable parts from technical error messages
    if (message.includes('429') && message.includes('RPM')) {
      const match = message.match(/max RPM: (\d+)/);
      const rpm = match ? match[1] : 'limit';
      return `API rate limit exceeded (${rpm} requests/minute). Please wait before trying again.`;
    }
    
    if (message.includes('Error:') && message.length > 100) {
      // For long error messages, show a cleaner version
      const cleanMsg = message.replace(/^Error:\s*/, '').split('\n')[0];
      return cleanMsg.length > 80 ? cleanMsg.substring(0, 77) + '...' : cleanMsg;
    }
    
    return message;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 mx-auto max-w-2xl ${styling.container}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${styling.icon}`}>
          <IconComponent size={18} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium leading-relaxed ${styling.text}`}>
            {formatErrorMessage(content)}
          </div>
          
          {/* Error Actions */}
          {getErrorActions()}
          
          {/* Technical Details Toggle */}
          {details && Object.keys(details).length > 0 && (
            <div className="mt-3">
              <motion.button
                whileHover={{ x: 2 }}
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-1.5 text-xs opacity-75 hover:opacity-100 transition-opacity ${styling.text}`}
              >
                <FiExternalLink size={12} />
                {showDetails ? 'Hide' : 'Show'} technical details
              </motion.button>
              
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 p-3 rounded-lg bg-current/5 border border-current/10 overflow-hidden"
                >
                  <pre className={`text-xs font-mono whitespace-pre-wrap break-all ${styling.text} opacity-80`}>
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
