import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiX } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { SanitizedAgentOptions } from '@/common/types';
import { JsonRenderer } from '@/common/components/JsonRenderer';

/**
 * AgentConfigViewer - Premium IDE-style configuration viewer
 * 
 * Design principles:
 * - Elegant modal overlay with glass morphism
 * - Hierarchical tree structure for nested configurations
 * - Smooth animations and micro-interactions
 * - Premium typography and spacing
 * - Professional color scheme with subtle accents
 */

interface AgentConfigViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentConfigViewer: React.FC<AgentConfigViewerProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SanitizedAgentOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const options = await apiService.getAgentOptions();
      setConfig(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiSettings size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Agent Configuration
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current agent options and settings
                </p>
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
          <div className="flex-1 overflow-auto p-6 max-h-[calc(85vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading configuration...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load configuration</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadConfig}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </motion.button>
                </div>
              </div>
            ) : config && Object.keys(config).length > 0 ? (
              <JsonRenderer 
                data={config} 
                emptyMessage="No configuration available"
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">📋</div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No configuration available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">The agent has no exposed configuration options</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
