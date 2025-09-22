import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
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

export const AgentOptionsSelector = forwardRef<AgentOptionsSelectorRef, AgentOptionsSelectorProps>(({
  activeSessionId,
  sessionMetadata,
  className = '',
  onActiveOptionsChange,
  onToggleOption,
}, ref) => {
  const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  const getOptionIcon = (key: string, property: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      'foo': <TbBulb className="w-4 h-4" />,
      'search': <TbSearch className="w-4 h-4" />,
      'research': <TbBook className="w-4 h-4" />,
      'enable': <TbSettings className="w-4 h-4" />,
      'mode': <TbSettings className="w-4 h-4" />,
    };
    
    const lowerKey = key.toLowerCase();
    const lowerTitle = (property.title || '').toLowerCase();
    
    for (const [pattern, icon] of Object.entries(iconMap)) {
      if (lowerKey.includes(pattern) || lowerTitle.includes(pattern)) {
        return icon;
      }
    }
    
    return <TbSettings className="w-4 h-4" />;
  };

  // Load agent options - NO dependencies to avoid cycles
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

  // Handle option change - NO currentValues dependency
  const handleOptionChange = useCallback(async (key: string, value: any) => {
    if (!activeSessionId || isLoading) return;

    setIsLoading(true);
    
    // Update state optimistically
    setCurrentValues(prev => prev ? { ...prev, [key]: value } : { [key]: value });

    // Notify parent
    if (onToggleOption) {
      onToggleOption(key, value);
    }

    try {
      // Get fresh values and update
      const response = await apiService.getSessionRuntimeSettings(activeSessionId);
      const newValues = { ...response.currentValues, [key]: value };
      
      await apiService.updateSessionRuntimeSettings(activeSessionId, newValues);
      
      // Update state with server response
      setCurrentValues(newValues);
      
    } catch (error) {
      console.error('Failed to update runtime settings:', error);
      // Reload on error
      loadAgentOptions();
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, isLoading, onToggleOption, loadAgentOptions]);

  // Expose methods - stable reference
  useImperativeHandle(ref, () => ({
    toggleOption: (key: string) => {
      if (!schema?.properties || !currentValues) return;
      
      const property = schema.properties[key];
      if (!property) return;
      
      const currentValue = currentValues[key] ?? property.default;
      
      if (property.type === 'boolean') {
        handleOptionChange(key, !currentValue);
      } else if (property.type === 'string' && property.enum) {
        handleOptionChange(key, property.default);
      }
    },
  }), [schema, currentValues, handleOptionChange]);

  // Load on mount/session change
  useEffect(() => {
    if (activeSessionId && !isReplayMode) {
      loadAgentOptions();
    }
  }, [activeSessionId, isReplayMode, loadAgentOptions]);

  // Calculate active options
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

  // Notify parent about active options
  useEffect(() => {
    if (onActiveOptionsChange) {
      onActiveOptionsChange(activeOptionsWithKeys);
    }
  }, [activeOptionsWithKeys, onActiveOptionsChange]);

  if (isReplayMode || isProcessing || !schema?.properties) {
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
      const enumOptions = property.enum || [];
      return (
        <React.Fragment key={key}>
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
          
          <div className="ml-7 mr-3 mb-1 space-y-0.5">
            {enumOptions.map((option: any) => (
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
        </React.Fragment>
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