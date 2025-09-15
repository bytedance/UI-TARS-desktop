import React from 'react';
import { motion } from 'framer-motion';
import { FiSettings, FiX } from 'react-icons/fi';
import { Dialog } from '@headlessui/react';

interface AgentConfigViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Agent Configuration Viewer - Deprecated
 * 
 * This component previously displayed agent options from v1/agent/options endpoint.
 * The endpoint has been removed to simplify the architecture.
 * Agent configuration is now handled through session metadata.
 */
export const AgentConfigViewer: React.FC<AgentConfigViewerProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiSettings size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Agent Configuration
                </h2>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX size={20} className="text-gray-500 dark:text-gray-400" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center">
              <div className="text-gray-400 mb-3">🔧</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                Configuration Unavailable
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agent configuration is now handled through session-specific settings.
              </p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
