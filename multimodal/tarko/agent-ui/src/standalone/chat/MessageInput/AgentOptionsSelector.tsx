import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiPlus } from 'react-icons/fi';
import { Dropdown, DropdownItem, DropdownHeader } from '@tarko/ui';

interface AgentOptionsSelectorProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  className?: string;
  onActiveOptionsChange?: (options: string[]) => void;
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

export const AgentOptionsSelector: React.FC<AgentOptionsSelectorProps> = ({
  activeSessionId,
  sessionMetadata,
  className = '',
  onActiveOptionsChange,
}) => {
  const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

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

  // Notify parent about active options
  useEffect(() => {
    if (onActiveOptionsChange && schema && currentValues) {
      const activeOptions = Object.entries(schema.properties)
        .filter(([key, property]) => {
          const currentValue = currentValues[key] ?? property.default;
          if (property.type === 'boolean') {
            return currentValue === true;
          }
          if (property.type === 'string' && property.enum) {
            return currentValue && currentValue !== property.default;
          }
          return false;
        })
        .map(([key, property]) => property.title || key);
      
      onActiveOptionsChange(activeOptions);
    }
  }, [schema, currentValues, onActiveOptionsChange]);

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

  const renderOptionItem = (config: AgentOptionConfig) => {
    const { key, property, currentValue } = config;

    if (property.type === 'boolean') {
      return (
        <DropdownItem
          key={key}
          onClick={() => handleOptionChange(key, !currentValue)}
          className={`${
            currentValue 
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex-1">
            <div className="font-medium">{property.title || key}</div>
            {property.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {property.description}
              </div>
            )}
          </div>
        </DropdownItem>
      );
    }

    if (property.type === 'string' && property.enum) {
      const options = property.enum || [];
      return options.map((option: any) => (
        <DropdownItem
          key={`${key}-${option}`}
          onClick={() => handleOptionChange(key, option)}
          className={`${
            currentValue === option 
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex-1">
            <div className="font-medium">{property.title || key}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{option}</div>
          </div>
        </DropdownItem>
      ));
    }

    return null;
  };

  return (
    <Dropdown
      placement="top-start"
      trigger={
        <button
          type="button"
          disabled={isLoading}
          className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          title={`Agent Options (${options.length})`}
        >
          <FiPlus size={16} className="transition-transform duration-200" />
          {isLoading && (
            <div className="absolute w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </button>
      }
    >
      <DropdownHeader>Agent Options</DropdownHeader>
      <div className="text-xs text-gray-500 dark:text-gray-400 px-1 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
        Configure agent behavior for this session
      </div>
      {options.map(renderOptionItem)}
    </Dropdown>
  );
};
