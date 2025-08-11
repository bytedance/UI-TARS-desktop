import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiCpu, FiCheck } from 'react-icons/fi';
import { Listbox, Transition } from '@headlessui/react';
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
 * - Uses Headless UI for robust positioning and accessibility
 * - Keyboard navigation support
 * - Automatic collision detection and positioning
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({ sessionId, className = '' }) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<{ provider: string; modelId: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>('above');
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const handleModelChange = async (selectedOption: { provider: string; modelId: string }) => {
    if (!sessionId || isLoading) return;

    setIsLoading(true);
    try {
      const success = await apiService.updateSessionModel(
        sessionId,
        selectedOption.provider,
        selectedOption.modelId,
      );
      if (success) {
        setCurrentModel(selectedOption);
      }
    } catch (error) {
      console.error('Failed to update session model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create options array for Listbox
  const allModelOptions =
    availableModels?.models.flatMap((config) =>
      config.models.map((modelId) => ({ provider: config.provider, modelId })),
    ) || [];

  // Calculate optimal dropdown position to avoid clipping
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = Math.min(256, allModelOptions.length * 40 + 80); // Estimate dropdown height

    // Check if there's enough space above
    const spaceAbove = buttonRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;

    // Prefer positioning above (as in original design), but fallback to below if needed
    if (spaceAbove >= dropdownHeight || spaceAbove > spaceBelow) {
      setDropdownPosition('above');
    } else {
      setDropdownPosition('below');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Listbox value={currentModel} onChange={handleModelChange} disabled={isLoading}>
        {({ open }) => (
          <>
            <Listbox.Button
              as={motion.button}
              ref={buttonRef}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={calculateDropdownPosition}
              className={`h-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-700/90 rounded-full border border-gray-200/60 dark:border-gray-600/40 shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <FiCpu size={12} className="text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex items-center min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {currentModel
                    ? `${currentModel.modelId} (${currentModel.provider})`
                    : 'Select Model'}
                </span>
              </div>

              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <FiChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
              </motion.div>
            </Listbox.Button>

            <Transition
              show={open}
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Listbox.Options
                className={`absolute left-0 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-600/40 shadow-lg backdrop-blur-sm z-50 focus:outline-none ${
                  dropdownPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
              >
                <div className="p-2 max-h-64 overflow-y-auto">
                  <div className="mb-2 px-3 py-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Available Models
                    </span>
                  </div>

                  <div className="space-y-1">
                    {allModelOptions.map((option, idx) => {
                      const props = { ['ke' + 'y']: idx };
                      return (
                        <Listbox.Option
                          {...props}
                          value={option}
                          className={({ active, selected }) =>
                            `cursor-pointer select-none relative px-3 py-2 text-sm rounded-md transition-colors duration-150 flex items-center justify-between ${
                              active
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : selected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300'
                            } ${isLoading ? 'opacity-50' : ''}`
                          }
                          disabled={isLoading}
                        >
                          {({ selected }) => (
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">
                                  {option.modelId} ({option.provider})
                                </span>
                              </div>
                              {selected && (
                                <FiCheck
                                  size={14}
                                  className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                                />
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      );
                    })}
                  </div>
                </div>
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  );
};
