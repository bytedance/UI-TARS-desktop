import React, { useState, useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiChevronDown, FiSettings } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

interface AgentOptionsSelectorProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  className?: string;
}

interface AgentOptionsSchema {
  type: string;
  properties: Record<string, any>;
}

interface AgentOptionConfig {
  key: string;
  property: any;
  currentValue: any;
}

// Component for boolean options (toggle switch)
const BooleanOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
}> = ({ config, onChange }) => {
  const { key, property, currentValue } = config;
  const isChecked = Boolean(currentValue);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {property.title || key}
        </div>
        {property.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {property.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(key, !isChecked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isChecked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isChecked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

// Component for enum options with 2 values (toggle buttons)
const BinaryEnumOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
}> = ({ config, onChange }) => {
  const { key, property, currentValue } = config;
  const options = property.enum || [];
  const isFirstOption = currentValue === options[0];

  return (
    <div className="py-2">
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {property.title || key}
        </div>
        {property.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {property.description}
          </div>
        )}
      </div>
      <div
        className="inline-flex rounded-md border border-gray-200 dark:border-gray-600"
        role="group"
      >
        <button
          type="button"
          onClick={() => onChange(key, options[0])}
          className={`px-3 py-1.5 text-xs font-medium transition-all rounded-l-md ${
            isFirstOption
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {options[0]}
        </button>
        <button
          type="button"
          onClick={() => onChange(key, options[1])}
          className={`px-3 py-1.5 text-xs font-medium transition-all rounded-r-md border-l border-gray-200 dark:border-gray-600 ${
            !isFirstOption
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {options[1]}
        </button>
      </div>
    </div>
  );
};

// Component for enum options with 3+ values (select dropdown)
const MultiEnumOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
}> = ({ config, onChange }) => {
  const { key, property, currentValue } = config;
  const options = property.enum || [];

  return (
    <div className="py-2">
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {property.title || key}
        </div>
        {property.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {property.description}
          </div>
        )}
      </div>
      <select
        value={currentValue || options[0]}
        onChange={(e) => onChange(key, e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((option: any) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export const AgentOptionsSelector: React.FC<AgentOptionsSelectorProps> = ({
  activeSessionId,
  sessionMetadata,
  className = '',
}) => {
  const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadAgentOptions = async () => {
    if (!activeSessionId) return;

    try {
      const response = await apiService.getSessionAgentOptions(activeSessionId);
      setSchema(response.schema);
      setCurrentValues(response.currentValues);
    } catch (error) {
      console.error('Failed to load agent options:', error);
    }
  };

  const handleOptionChange = async (key: string, value: any) => {
    if (!activeSessionId || isLoading || !currentValues) return;

    const newValues = { ...currentValues, [key]: value };
    setCurrentValues(newValues);

    setIsLoading(true);
    try {
      const response = await apiService.updateSessionAgentOptions(activeSessionId, newValues);
      if (response.success && response.sessionInfo?.metadata) {
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata,
        });
      }
    } catch (error) {
      console.error('Failed to update agent options:', error);
      // Revert the change on error
      setCurrentValues(currentValues);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSessionId && !isReplayMode) {
      loadAgentOptions();
    }
  }, [activeSessionId, isReplayMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Don't show anything if no schema, in replay mode, or processing
  if (isReplayMode || isProcessing || !schema || !schema.properties) {
    return null;
  }

  const options = Object.entries(schema.properties).map(([key, property]) => ({
    key,
    property,
    currentValue: currentValues?.[key] ?? property.default,
  }));

  if (options.length === 0) {
    return null;
  }

  const renderOption = (config: AgentOptionConfig) => {
    const { property } = config;

    if (property.type === 'boolean') {
      return <BooleanOption key={config.key} config={config} onChange={handleOptionChange} />;
    }

    if (property.type === 'string' && property.enum) {
      if (property.enum.length === 2) {
        return <BinaryEnumOption key={config.key} config={config} onChange={handleOptionChange} />;
      } else {
        return <MultiEnumOption key={config.key} config={config} onChange={handleOptionChange} />;
      }
    }

    return null;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
        title="Agent Options"
      >
        <FiSettings size={14} />
        <span>Options ({options.length})</span>
        <FiChevronDown
          size={12}
          className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        {isLoading && (
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Agent Options
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configure agent behavior for this session
                </p>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">{options.map(renderOption)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
