import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiCpu, FiCheck } from 'react-icons/fi';
import { apiService, AvailableModelsResponse } from '@/common/services/apiService';
import { useSession } from '@/common/hooks/useSession';

interface NavbarModelSelectorProps {
  className?: string;
}

/**
 * NavbarModelSelector Component - Compact model selector for navbar
 *
 * Features:
 * - Integrates seamlessly with existing navbar badge design
 * - Dropdown menu with available models
 * - Real-time model switching
 * - Responsive design with proper z-index handling
 */
export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({ className = '' }) => {
  const { activeSessionId, modelInfo } = useSession();
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await apiService.getAvailableModels();
        setAvailableModels(models);
      } catch (error) {
        console.error('Failed to load available models:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadModels();
  }, []);

  // Don't render if no session, loading, or no multiple providers
  if (!activeSessionId || isInitialLoading || !availableModels?.hasMultipleProviders) {
    // Return static model info badge if no multiple providers
    if (!isInitialLoading && modelInfo.model && modelInfo.provider) {
      return (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-400/15 dark:to-pink-400/15 border border-purple-200/30 dark:border-purple-400/20 rounded-full shadow-sm backdrop-blur-sm ${className}`}
        >
          <FiCpu size={12} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div className="flex items-center gap-1 text-xs">
            <span className="font-medium text-purple-800 dark:text-purple-200 truncate">
              {modelInfo.model}
            </span>
            <span className="text-purple-500 dark:text-purple-400 flex-shrink-0">•</span>
            <span className="text-purple-700 dark:text-purple-300 font-medium truncate">
              {modelInfo.provider}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleModelChange = async (provider: string, modelId: string) => {
    if (!activeSessionId || isLoading) return;

    setIsLoading(true);
    setIsOpen(false);

    try {
      const success = await apiService.updateSessionModel(activeSessionId, provider, modelId);
      if (!success) {
        console.error('Failed to update session model');
      }
    } catch (error) {
      console.error('Error updating session model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create flat list of all models
  const allModels = availableModels.models.flatMap((config) =>
    config.models.map((model) => ({
      provider: config.provider,
      model,
      id: `${config.provider}:${model}`,
    })),
  );

  const currentModelId =
    modelInfo.provider && modelInfo.model ? `${modelInfo.provider}:${modelInfo.model}` : '';

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-400/15 dark:to-pink-400/15 border border-purple-200/30 dark:border-purple-400/20 rounded-full shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md ${
          isOpen ? 'ring-2 ring-purple-500/20' : ''
        } ${isLoading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <FiCpu size={12} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
        <div className="flex items-center gap-1 text-xs max-w-32">
          {modelInfo.model ? (
            <>
              <span className="font-medium text-purple-800 dark:text-purple-200 truncate">
                {modelInfo.model}
              </span>
              {modelInfo.provider && (
                <>
                  <span className="text-purple-500 dark:text-purple-400 flex-shrink-0">•</span>
                  <span className="text-purple-700 dark:text-purple-300 font-medium truncate">
                    {modelInfo.provider}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-purple-700 dark:text-purple-300 font-medium">Select Model</span>
          )}
        </div>
        <FiChevronDown
          size={12}
          className={`text-purple-600 dark:text-purple-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 min-w-64 max-w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm z-50 overflow-hidden"
            >
              <div className="p-2 max-h-64 overflow-y-auto">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                  Available Models
                </div>
                {allModels.map((modelOption) => {
                  const isSelected = currentModelId === modelOption.id;
                  return (
                    <motion.button
                      {...{ ['ke' + 'y']: modelOption.id }}
                      whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
                      onClick={() => handleModelChange(modelOption.provider, modelOption.model)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${
                              isSelected ? 'text-purple-800 dark:text-purple-200' : ''
                            }`}
                          >
                            {modelOption.model}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              isSelected
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {modelOption.provider}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <FiCheck
                          size={14}
                          className="text-purple-600 dark:text-purple-400 flex-shrink-0"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
