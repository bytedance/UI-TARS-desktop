import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiEye, FiMonitor, FiCode } from 'react-icons/fi';
import { useSession } from '../../hooks/useSession';
import { apiService } from '@/v2/services/apiService';

/**
 * BrowserControlToolbar - Displays browser control information in the toolbar
 *
 * Design principles:
 * - Compact visualization of complex browser control data
 * - Unobtrusive presentation that adapts to the vertical toolbar
 * - Provides essential information at a glance
 * - Uses color coding to indicate different control modes
 */
export const BrowserControlToolbar: React.FC = () => {
  const [browserMode, setBrowserMode] = useState<string>('default');
  const [toolCount, setToolCount] = useState<number>(0);
  const { activeSessionId, connectionStatus } = useSession();

  // Fetch browser control info when active session changes
  useEffect(() => {
    if (activeSessionId && connectionStatus.connected) {
      apiService
        .getBrowserControlInfo(activeSessionId)
        .then((info) => {
          setBrowserMode(info.mode);
          setToolCount(info.tools.length);
        })
        .catch((error) => {
          console.error('Failed to get browser control info:', error);
        });
    }
  }, [activeSessionId, connectionStatus.connected]);

  // Don't render if no active browser tools
  if (!toolCount) return null;

  // Get appropriate icon and color based on mode
  const getModeDetails = () => {
    switch (browserMode) {
      case 'default':
        return {
          icon: <FiCpu size={16} />,
          color: 'text-purple-500 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          borderColor: 'border-purple-200/40 dark:border-purple-800/30',
          title: 'Hybrid Browser Control',
        };
      case 'browser-use-only':
        return {
          icon: <FiCode size={16} />,
          color: 'text-blue-500 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          borderColor: 'border-blue-200/40 dark:border-blue-800/30',
          title: 'DOM-based Browser Control',
        };
      case 'gui-agent-only':
        return {
          icon: <FiEye size={16} />,
          color: 'text-green-500 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-200/40 dark:border-green-800/30',
          title: 'Vision-based Browser Control',
        };
      default:
        return {
          icon: <FiMonitor size={16} />,
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700/40',
          borderColor: 'border-gray-200/40 dark:border-gray-700/30',
          title: 'Browser Control',
        };
    }
  };

  const { icon, color, bgColor, borderColor, title } = getModeDetails();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="mx-auto mb-4"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor} ${color} border ${borderColor}`}
        title={`${title} (${toolCount} tools)`}
      >
        {icon}
      </div>
    </motion.div>
  );
};
