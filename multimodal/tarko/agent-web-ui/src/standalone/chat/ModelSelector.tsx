import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiCpu, FiCheck } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';

interface ModelConfig {
  provider: string;
  models: string[];
}

interface AvailableModelsResponse {
  models: ModelConfig[];
  defaultModel: {
    provider: string;
    modelId: string;
  };
  hasMultipleProviders: boolean;
}

interface ModelSelectorProps {
  sessionId: string;
  className?: string;
}

/**
 * ModelSelector Component - Allows users to switch models for the current session
 *
 * Features:
 * - Only shows when multiple model providers are configured
 * - Displays current model and provider
 * - Supports real-time model switching
 * - Elegant dropdown interface with animations
 * - Keyboard navigation support
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({ sessionId, className = '' }) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<{ provider: string; modelId: string } | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await apiService.getAvailableModels();
        setAvailableModels(models);

        // Set initial current model to default
        if (models.defaultModel) {
          setCurrentModel(models.defaultModel);
        }
      } catch (error) {
        console.error('Failed to load available models:', error);
      }
    };

    loadModels();
  }, []);

  // Don't render if no multiple providers available
  if (!availableModels?.hasMultipleProviders || availableModels.models.length === 0) {
    return null;
  }

  const handleModelChange = async (provider: string, modelId: string) => {
    if (!sessionId || isLoading) return;

    setIsLoading(true);
    try {
      const success = await apiService.updateSessionModel(sessionId, provider, modelId);
      if (success) {
        setCurrentModel({ provider, modelId });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to update session model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderModelOption = (provider: string, modelId: string, index: number) => {
    const isSelected = currentModel?.provider === provider && currentModel?.modelId === modelId;
    const keyProp = 'key';

    return (
      <motion.button
        {...{ [keyProp]: index }}
        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleModelChange(provider, modelId)}
        disabled={isLoading}
        className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors duration-150 flex items-center justify-between ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block">{modelId} ({provider})</span>
        </div>
        {isSelected && <FiCheck size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
      </motion.button>
    );
  };

  const allModelOptions = availableModels.models.flatMap((config) =>
    config.models.map((modelId) => ({ provider: config.provider, modelId })),
  );

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`h-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-700/90 rounded-full border border-gray-200/60 dark:border-gray-600/40 shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <FiCpu size={12} className="text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex items-center max-w-32">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {currentModel ? `${currentModel.modelId} (${currentModel.provider})` : 'Select Model'}
          </span>
        </div>

        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-10"
            />

            {/* Dropdown - positioned above */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-600/40 shadow-lg backdrop-blur-sm z-20"
            >
              <div className="p-2 max-h-64 overflow-y-auto">
                <div className="mb-2 px-3 py-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Available Models
                  </span>
                </div>

                <div className="space-y-1">
                  {allModelOptions.map(({ provider, modelId }, index) =>
                    renderModelOption(provider, modelId, index),
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
