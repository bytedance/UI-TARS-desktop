import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiPlus, FiCheck, FiChevronRight } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings } from 'react-icons/tb';
import { Dropdown, DropdownItem, DropdownHeader, DropdownDivider } from '@tarko/ui';

interface ActiveOption {
  key: string;
  title: string;
  currentValue: any;
}

interface AgentOptionsSelectorProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  className?: string;
  onActiveOptionsChange?: (options: ActiveOption[]) => void;
  onToggleOption?: (key: string, currentValue: any) => void;
}

export interface AgentOptionsSelectorRef {
  toggleOption: (key: string) => void;
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

export const AgentOptionsSelector = forwardRef<AgentOptionsSelectorRef, AgentOptionsSelectorProps>((
  {
    activeSessionId,
    sessionMetadata,
    className = '',
    onActiveOptionsChange,
    onToggleOption,
  },
  ref
) => {
  const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  const getOptionIcon = (key: string, property: any) => {
    // Map common option keys to icons
    const iconMap: Record<string, React.ReactNode> = {
      'foo': <TbBulb className="w-4 h-4" />,
      'search': <TbSearch className="w-4 h-4" />,
      'research': <TbBook className="w-4 h-4" />,
      'enable': <TbSettings className="w-4 h-4" />,
      'mode': <TbSettings className="w-4 h-4" />,
    };
    
    // Try to match by key or title
    const lowerKey = key.toLowerCase();
    const lowerTitle = (property.title || '').toLowerCase();
    
    for (const [pattern, icon] of Object.entries(iconMap)) {
      if (lowerKey.includes(pattern) || lowerTitle.includes(pattern)) {
        return icon;
      }
    }
    
    return <TbSettings className="w-4 h-4" />; // Default icon
  };

  const loadAgentOptions = useCallback(async () => {
    if (!activeSessionId) return;

    try {
      const response = await apiService.getSessionRuntimeSettings(activeSessionId);
      setSchema(response.schema);
      setCurrentValues(response.currentValues);
    } catch (error) {
      console.error('Failed to load runtime settings:', error);
    }
  }, [activeSessionId]);

  const handleOptionChange = useCallback(async (key: string, value: any) => {
    if (!activeSessionId || isLoading || !currentValues) return;

    const newValues = { ...currentValues, [key]: value };
    setCurrentValues(newValues);

    // Notify parent about the toggle
    if (onToggleOption) {
      onToggleOption(key, value);
    }

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
  }, [activeSessionId, isLoading, currentValues, onToggleOption, updateSessionMetadata]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    toggleOption: (key: string) => {
      if (!schema || !currentValues) return;
      
      const property = schema.properties[key];
      if (!property) return;
      
      const currentValue = currentValues[key] ?? property.default;
      
      if (property.type === 'boolean') {
        handleOptionChange(key, !currentValue);
      } else if (property.type === 'string' && property.enum) {
        // For enum, toggle to default value
        handleOptionChange(key, property.default);
      }
    },
  }), [handleOptionChange]);

  useEffect(() => {
    if (activeSessionId && !isReplayMode) {
      loadAgentOptions();
    }
  }, [activeSessionId, isReplayMode, loadAgentOptions]);

  // Notify parent about active options - use useMemo to prevent unnecessary re-renders
  const activeOptionsWithKeys = React.useMemo(() => {
    if (!schema || !currentValues) return [];
    
    return Object.entries(schema.properties)
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
      .map(([key, property]) => ({
        key,
        title: property.title || key,
        currentValue: currentValues[key] ?? property.default
      }));
  }, [schema, currentValues]);

  useEffect(() => {
    if (onActiveOptionsChange) {
      onActiveOptionsChange(activeOptionsWithKeys);
    }
  }, [activeOptionsWithKeys, onActiveOptionsChange]);

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
    const icon = getOptionIcon(key, property);

    if (property.type === 'boolean') {
      return (
        <DropdownItem
          key={key}
          icon={icon}
          onClick={() => handleOptionChange(key, !currentValue)}
          className={`${
            currentValue 
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between min-w-0">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{property.title || key}</div>
              {property.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {property.description}
                </div>
              )}
            </div>
            {currentValue && (
              <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
            )}
          </div>
        </DropdownItem>
      );
    }

    if (property.type === 'string' && property.enum) {
      const options = property.enum || [];
      return (
        <>
          {/* Section header for enum options */}
          <div className="px-3 py-1.5">
            <div className="flex items-center">
              <span className="mr-3 text-gray-600 dark:text-gray-400 flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {property.title || key}
                </div>
                {property.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {property.description}
                  </div>
                )}
              </div>
              <FiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </div>
          
          {/* Options */}
          <div className="ml-7 mr-3 mb-1 space-y-0.5">
            {options.map((option: any) => (
              <button
                key={`${key}-${option}`}
                onClick={() => handleOptionChange(key, option)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                  currentValue === option 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{option}</span>
                  {currentValue === option && (
                    <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      );
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
      <DropdownHeader>Settings</DropdownHeader>
      {options.map(renderOptionItem)}
    </Dropdown>
  );
});
