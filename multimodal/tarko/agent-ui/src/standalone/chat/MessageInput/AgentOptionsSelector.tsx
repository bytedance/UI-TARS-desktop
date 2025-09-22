import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiChevronDown, FiSettings, FiPlus } from 'react-icons/fi';
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
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, placement: 'below' as 'above' | 'below' });
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate popup position when opening
  const updatePopupPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const popupHeight = 300; // Estimated popup height
      const margin = 8;
      
      // Check if there's enough space below the button
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let placement: 'above' | 'below' = 'above'; // Default to above to avoid covering input
      let top = rect.top - margin;
      
      // Only place below if there's significantly more space below AND not enough above
      if (spaceBelow > popupHeight + 100 && spaceAbove < popupHeight + margin) {
        placement = 'below';
        top = rect.bottom + margin;
      }
      
      setPopupPosition({
        top,
        left: rect.left,
        placement,
      });
    }
  };

  const loadAgentOptions = async () => {
    if (!activeSessionId) return;

    try {
      const response = await apiService.getSessionRuntimeSettings(activeSessionId);
      setSchema(response.schema);
      setCurrentValues(response.currentValues);
    } catch (error) {
      console.error('Failed to load runtime settings:', error);
    }
  };

  const handleOptionChange = async (key: string, value: any) => {
    if (!activeSessionId || isLoading || !currentValues) return;

    const newValues = { ...currentValues, [key]: value };
    setCurrentValues(newValues);

    setIsLoading(true);
    try {
      const response = await apiService.updateSessionRuntimeSettings(activeSessionId, newValues);
      if (response.success && response.sessionInfo?.metadata) {
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata,
        });
      }
    } catch (error) {
      console.error('Failed to update runtime settings:', error);
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
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is inside the portal popup
        const popupElement = document.getElementById('agent-options-popup');
        if (popupElement && popupElement.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePopupPosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

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
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            updatePopupPosition();
          }
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
        title={`Agent Options (${options.length})`}
      >
        <FiPlus size={16} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        {isLoading && (
          <div className="absolute w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Portal for popup */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            id="agent-options-popup"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              transform: popupPosition.placement === 'above' ? 'translateY(-100%)' : 'none',
              zIndex: 10000,
            }}
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
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
