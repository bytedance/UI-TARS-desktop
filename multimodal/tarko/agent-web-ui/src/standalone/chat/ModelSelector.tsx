import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiChevronDown } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { useDarkMode } from '@/common/hooks/useDarkMode';

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
 * ModelSelector Component - Clean, native implementation with app-consistent styling
 *
 * Features:
 * - Native dropdown with custom styling
 * - Responsive dark mode support
 * - Smooth animations
 * - Minimal design matching app aesthetics
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({ sessionId, className = '' }) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDarkMode = useDarkMode();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await apiService.getAvailableModels();
        setAvailableModels(models);

        // Set initial current model to default
        if (models.defaultModel) {
          const modelKey = `${models.defaultModel.provider}:${models.defaultModel.modelId}`;
          setCurrentModel(modelKey);
        }
      } catch (error) {
        console.error('Failed to load available models:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadModels();
  }, []);

  // Don't render if no multiple providers available
  if (isInitialLoading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="w-3 h-3 border border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!availableModels?.hasMultipleProviders || availableModels.models.length === 0) {
    return null;
  }

  const handleModelChange = async (selectedValue: string) => {
    if (!sessionId || isLoading || !selectedValue) return;

    const [provider, modelId] = selectedValue.split(':');
    if (!provider || !modelId) return;

    setIsLoading(true);
    setIsOpen(false);

    try {
      const success = await apiService.updateSessionModel(sessionId, provider, modelId);
      if (success) {
        setCurrentModel(selectedValue);
      }
    } catch (error) {
      console.error('Failed to update session model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create options array
  const allModelOptions = availableModels.models.flatMap((config) =>
    config.models.map((modelId) => ({
      value: `${config.provider}:${modelId}`,
      provider: config.provider,
      modelId,
      label: `${modelId}`,
    })),
  );

  const selectedOption = allModelOptions.find((opt) => opt.value === currentModel);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-200 min-w-[140px] max-w-[180px]
          ${
            isDarkMode
              ? 'bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-200'
              : 'bg-white/60 hover:bg-white/80 border border-gray-200/50 text-gray-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          backdrop-blur-sm shadow-sm hover:shadow-md
        `}
      >
        {/* Icon */}
        <div
          className={`
          w-4 h-4 rounded flex items-center justify-center flex-shrink-0
          ${
            isDarkMode
              ? 'bg-indigo-500/20 border border-indigo-400/30'
              : 'bg-indigo-500/10 border border-indigo-400/20'
          }
        `}
        >
          <FiZap size={10} className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'} />
        </div>

        {/* Model name */}
        <span className="flex-1 truncate text-left">
          {selectedOption ? selectedOption.label : 'Select Model'}
        </span>

        {/* Loading or chevron */}
        {isLoading ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin opacity-60" />
        ) : (
          <FiChevronDown
            size={12}
            className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute bottom-full left-0 mb-1 w-full min-w-[200px] max-w-[240px] z-[9999]
              rounded-lg shadow-xl border backdrop-blur-md
              ${isDarkMode ? 'bg-gray-800/98 border-gray-700/60' : 'bg-white/98 border-gray-200/60'}
            `}
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {allModelOptions.map((option) => {
                const isSelected = currentModel === option.value;
                const itemProps = { ['ke' + 'y']: option.value };
                return (
                  <motion.button
                    {...itemProps}
                    whileHover={{
                      backgroundColor: isDarkMode
                        ? 'rgba(99, 102, 241, 0.1)'
                        : 'rgba(99, 102, 241, 0.05)',
                    }}
                    onClick={() => handleModelChange(option.value)}
                    className={`
                      w-full px-3 py-2 text-left text-xs flex items-center gap-2.5
                      transition-colors duration-150
                      ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-indigo-500/10 text-indigo-700'
                          : isDarkMode
                            ? 'text-gray-300 hover:text-gray-100'
                            : 'text-gray-700 hover:text-gray-900'
                      }
                    `}
                  >
                    {/* Provider badge */}
                    <span
                      className={`
                      px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0
                      ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-indigo-500/30 border-indigo-400/40 text-indigo-200'
                            : 'bg-indigo-500/15 border-indigo-400/30 text-indigo-700'
                          : isDarkMode
                            ? 'bg-gray-700/50 border-gray-600/50 text-gray-400'
                            : 'bg-gray-100/50 border-gray-300/50 text-gray-600'
                      }
                    `}
                    >
                      {option.provider}
                    </span>

                    {/* Model name */}
                    <span
                      className={`flex-1 truncate ${isSelected ? 'font-medium' : 'font-normal'}`}
                    >
                      {option.modelId}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
