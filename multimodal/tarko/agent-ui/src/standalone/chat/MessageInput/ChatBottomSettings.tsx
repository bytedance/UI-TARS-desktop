import React, { useState, useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata, AgentRuntimeSettingsSchema, AgentRuntimeSettingProperty } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiCheck, FiLoader } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbBrowser } from 'react-icons/tb';



interface ChatBottomSettingsProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  className?: string;
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export const ChatBottomSettings: React.FC<ChatBottomSettingsProps> = ({
  activeSessionId,
  sessionMetadata,
  className = '',
  isDisabled = false,
  isProcessing: isProcessingProp = false,
}) => {
  const [schema, setSchema] = useState<AgentRuntimeSettingsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [placement, setPlacement] = useState<'dropdown-item' | 'chat-bottom'>('dropdown-item');
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(false);
  }, [activeSessionId]);

  // Handle option change
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

        console.log('Agent options updated successfully', { key, value });
      }
    } catch (error) {
      console.error('Failed to update runtime settings:', error);
      // Revert on error
      setCurrentValues(currentValues);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
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

  const getOptionIcon = (key: string, property: AgentRuntimeSettingProperty) => {
    // Use custom icon if specified
    if (property.icon) {
      switch (property.icon) {
        case 'browser': return <TbBrowser className="w-4 h-4" />;
        case 'search': return <TbSearch className="w-4 h-4" />;
        case 'book': return <TbBook className="w-4 h-4" />;
        case 'bulb': return <TbBulb className="w-4 h-4" />;
        case 'brain': return <TbBrain className="w-4 h-4" />;
        default: return <TbSettings className="w-4 h-4" />;
      }
    }

    // Fallback to key/title-based detection
    const lowerKey = key.toLowerCase();
    const lowerTitle = (property.title || '').toLowerCase();
    if (lowerKey.includes('browser') || lowerTitle.includes('browser'))
      return <TbBrowser className="w-4 h-4" />;
    if (lowerKey.includes('search')) return <TbSearch className="w-4 h-4" />;
    if (lowerKey.includes('research')) return <TbBook className="w-4 h-4" />;
    if (lowerKey.includes('foo')) return <TbBulb className="w-4 h-4" />;
    if (lowerKey.includes('thinking')) return <TbBrain className="w-4 h-4" />;
    return <TbSettings className="w-4 h-4" />;
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

  // Filter options that should appear in chat-bottom
  const chatBottomOptions = Object.entries(schema.properties).filter(([key, property]) => {
    const optionPlacement = property.placement || 'dropdown-item';
    return optionPlacement === 'chat-bottom';
  });

  if (chatBottomOptions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {chatBottomOptions.map(([key, property]) => {
        const currentValue = currentValues?.[key] ?? property.default;

        if (property.type === 'boolean') {
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleOptionChange(key, !currentValue)}
              disabled={isLoading || isDisabled}
              className={`group inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                currentValue
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 hover:border-blue-300/60 dark:hover:border-blue-600/60'
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-gray-300/60 dark:hover:border-gray-600/60'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={property.description || property.title || key}
            >
              <span className="mr-1.5 text-current">
                {getOptionIcon(key, property)}
              </span>
              <span className="font-medium">{property.title || key}</span>
              <div className="flex items-center gap-1 ml-1.5">
                {isLoading && <FiLoader className="w-3 h-3 animate-spin" />}
                {currentValue && !isLoading && <FiCheck className="w-3 h-3" />}
              </div>
            </button>
          );
        }

        if (property.type === 'string' && property.enum) {
          return (
            <div key={key} className="inline-flex items-center">
              <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {property.title || key}:
              </span>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {property.enum.map((option, index) => {
                  const isSelected = currentValue === option;
                  const displayLabel = getEnumDisplayLabel(property, option);
                  
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionChange(key, option)}
                      disabled={isLoading || isDisabled}
                      className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                        index === 0 ? 'border-r border-gray-200 dark:border-gray-700' : ''
                      } ${index === property.enum!.length - 1 ? '' : 'border-r border-gray-200 dark:border-gray-700'}`}
                      title={property.description}
                    >
                      {displayLabel}
                      {isLoading && isSelected && (
                        <FiLoader className="w-3 h-3 animate-spin ml-1 inline" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};