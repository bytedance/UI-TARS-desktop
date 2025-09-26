import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import {
  SessionItemMetadata,
  AgentRuntimeSettingsSchema,
  AgentRuntimeSettingProperty,
  AgentRuntimeSettingVisibilityCondition,
} from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiCheck, FiLoader, FiX, FiChevronDown } from 'react-icons/fi';
import { Dropdown, DropdownItem, DropdownHeader, DropdownDivider } from '@tarko/ui';
import { getAgentOptionIcon } from './agentIconUtils';

interface ActiveOption {
  key: string;
  title: string;
  currentValue: any;
  displayValue?: string;
}

interface ChatBottomSettingsProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  activeOptions?: ActiveOption[];
  onRemoveOption?: (key: string) => void;
  onOptionChange?: (key: string, value: any) => Promise<void> | void; // Custom option change handler
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export const ChatBottomSettings: React.FC<ChatBottomSettingsProps> = ({
  activeSessionId,
  sessionMetadata,
  activeOptions = [],
  onRemoveOption,
  onOptionChange,
  isDisabled = false,
  isProcessing: isProcessingProp = false,
}) => {
  const [schema, setSchema] = useState<AgentRuntimeSettingsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [placement, setPlacement] = useState<'dropdown-item' | 'chat-bottom'>('dropdown-item');
  const [loadingOptions, setLoadingOptions] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  // Load agent options - ONLY when session changes
  useEffect(() => {
    if (!activeSessionId || isReplayMode || hasLoaded) return;

    const loadOptions = async () => {
      try {
        const response = await apiService.getSessionRuntimeSettings(activeSessionId);
        const schema = response.schema as AgentRuntimeSettingsSchema;
        let currentValues = response.currentValues || {};

        // Merge with default values from schema if not present
        if (schema?.properties) {
          const mergedValues: Record<string, any> = { ...currentValues };
          Object.entries(schema.properties).forEach(([key, propSchema]) => {
            if (mergedValues[key] === undefined && propSchema.default !== undefined) {
              mergedValues[key] = propSchema.default;
            }
          });
          currentValues = mergedValues;
        }

        setSchema(schema);
        setCurrentValues(currentValues);
        // Use default placement
        setPlacement('dropdown-item');
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load runtime settings:', error);
      }
    };

    loadOptions();
  }, [activeSessionId, isReplayMode]);

  // Reset all state when session changes
  useEffect(() => {
    setHasLoaded(false);
    setSchema(null);
    setCurrentValues(null);
    setPlacement('dropdown-item');
    setLoadingOptions(new Set());
  }, [activeSessionId]);

  // Helper function to check if an option should be visible
  const isOptionVisible = (key: string, property: AgentRuntimeSettingProperty): boolean => {
    if (!property.visible || !currentValues) {
      return true; // Always visible if no condition
    }

    const { dependsOn, when } = property.visible;
    const dependentValue = currentValues[dependsOn];
    
    // Support both exact match and deep equality for complex values
    return dependentValue === when;
  };

  // Handle option change
  const handleOptionChange = async (key: string, value: any) => {
    if (loadingOptions.has(key) || !currentValues) return;

    // Use custom option change handler if provided (e.g., for home page)
    if (onOptionChange) {
      setLoadingOptions((prev) => new Set(prev).add(key));
      try {
        await onOptionChange(key, value);
        // Update local state after successful custom handling
        const newValues = { ...currentValues, [key]: value };
        setCurrentValues(newValues);
      } catch (error) {
        console.error('Failed to update runtime settings via custom handler:', error);
      } finally {
        setTimeout(() => {
          setLoadingOptions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }, 500);
      }
      return;
    }

    // Default behavior for session mode
    if (!activeSessionId) return;

    const newValues = { ...currentValues, [key]: value };
    setCurrentValues(newValues);
    setLoadingOptions((prev) => new Set(prev).add(key));

    try {
      const response = await apiService.updateSessionRuntimeSettings(activeSessionId, newValues);
      if (response.success && response.sessionInfo?.metadata) {
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata,
        });

        console.log('Agent options updated successfully', { key, value });
      }
    } catch (error) {
      console.error('Failed to update runtime settings:', error);
      // Revert on error
      setCurrentValues(currentValues);
    } finally {
      setTimeout(() => {
        setLoadingOptions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }, 500);
    }
  };

  const getEnumDisplayLabel = (property: AgentRuntimeSettingProperty, value: string): string => {
    if (property.enumLabels && property.enum) {
      const index = property.enum.indexOf(value);
      if (index >= 0 && index < property.enumLabels.length) {
        return property.enumLabels[index];
      }
    }
    return value;
  };

  // Don't render if in replay mode or processing
  if (
    isReplayMode ||
    isProcessingProp ||
    !schema?.properties ||
    Object.keys(schema.properties).length === 0
  ) {
    return null;
  }

  // Get all options that should appear in chat-bottom (default visible)
  const chatBottomOptions = Object.entries(schema.properties).filter(([key, property]) => {
    const optionPlacement = property.placement || 'dropdown-item';
    const isVisible = isOptionVisible(key, property);
    return optionPlacement === 'chat-bottom' && isVisible;
  });

  // Get activated dropdown options that should also appear here
  const activatedDropdownOptions = activeOptions.filter((option) => {
    // Only show dropdown options that are actually activated
    const property = schema.properties[option.key];
    if (!property) return false;
    const optionPlacement = property.placement || 'dropdown-item';
    return optionPlacement === 'dropdown-item';
  });

  // Don't render if no options to show
  if (chatBottomOptions.length === 0 && activatedDropdownOptions.length === 0) {
    return null;
  }

  const getOptionIcon = (key: string, property?: AgentRuntimeSettingProperty) => {
    return getAgentOptionIcon(key, property, 'sm');
  };

  const renderActivatedOption = (option: ActiveOption) => {
    const property = schema.properties[option.key];
    if (!property) return null;

    return (
      <button
        key={`activated-${option.key}`}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemoveOption?.(option.key);
        }}
        className="group inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200 cursor-pointer"
        title={`Remove ${option.title}`}
      >
        <span className="mr-1.5 text-indigo-600 dark:text-indigo-400 group-hover:opacity-0 transition-opacity duration-200">
          {getOptionIcon(option.key, property)}
        </span>
        <FiX className="absolute ml-0 w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <span className="truncate flex items-center">
          <span className="font-medium">{option.title}</span>
          {option.displayValue && (
            <span className="ml-1.5 text-xs text-indigo-600/80 dark:text-indigo-300/80 bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded-full font-medium">
              {option.displayValue}
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderChatBottomOption = ([key, property]: [string, AgentRuntimeSettingProperty]) => {
    const currentValue = currentValues?.[key] ?? property.default;
    const isOptionLoading = loadingOptions.has(key);

    if (property.type === 'boolean') {
      return (
        <button
          key={`chat-bottom-${key}`}
          type="button"
          onClick={() => handleOptionChange(key, !currentValue)}
          disabled={isOptionLoading || isDisabled}
          className={`inline-flex items-center px-2.5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            currentValue
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
              : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          } ${isOptionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={property.description || property.title || key}
        >
          <span className="mr-1.5 text-current">{getOptionIcon(key, property)}</span>
          <span className="font-medium">{property.title || key}</span>
          {isOptionLoading && <FiLoader className="w-3.5 h-3.5 animate-spin ml-1.5" />}
          {currentValue && !isOptionLoading && <FiCheck className="w-3.5 h-3.5 ml-1.5" />}
        </button>
      );
    }

    if (property.type === 'string' && property.enum) {
      const currentDisplayLabel = getEnumDisplayLabel(property, currentValue);

      return (
        <Dropdown
          key={`chat-bottom-${key}`}
          placement="top-start"
          trigger={
            <button
              type="button"
              disabled={isOptionLoading || isDisabled}
              className={`inline-flex items-center px-2.5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                isOptionLoading
                  ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-1.5 text-gray-500 dark:text-gray-400">
                {getOptionIcon(key, property)}
              </span>
              <span className="font-medium">{property.title || key}:</span>
              <span className="ml-1.5 font-medium text-gray-700 dark:text-gray-300">
                {currentDisplayLabel}
              </span>
              {isOptionLoading ? (
                <FiLoader className="w-3.5 h-3.5 animate-spin ml-1.5 text-gray-500 dark:text-gray-400" />
              ) : (
                <FiChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400 dark:text-gray-500" />
              )}
            </button>
          }
        >
          {property.enum.map((option) => {
            const isSelected = currentValue === option;
            const displayLabel = getEnumDisplayLabel(property, option);

            return (
              <DropdownItem
                key={option}
                onClick={() => handleOptionChange(key, option)}
                className={`${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''} ${isOptionLoading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{displayLabel}</span>
                  {isSelected && !isOptionLoading && (
                    <FiCheck className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
              </DropdownItem>
            );
          })}
        </Dropdown>
      );
    }

    return null;
  };

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {/* Render activated dropdown options first */}
      {activatedDropdownOptions.map(renderActivatedOption)}

      {/* Render default visible chat-bottom options */}
      {chatBottomOptions.map(renderChatBottomOption)}
    </div>
  );
};
