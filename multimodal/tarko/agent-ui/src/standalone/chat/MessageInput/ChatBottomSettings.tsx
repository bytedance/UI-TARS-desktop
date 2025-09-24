import React, { useState, useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata, AgentRuntimeSettingsSchema, AgentRuntimeSettingProperty } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiCheck, FiLoader, FiX, FiChevronDown } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbBrowser } from 'react-icons/tb';

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
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export const ChatBottomSettings: React.FC<ChatBottomSettingsProps> = ({
  activeSessionId,
  sessionMetadata,
  activeOptions = [],
  onRemoveOption,
  isDisabled = false,
  isProcessing: isProcessingProp = false,
}) => {
  const [schema, setSchema] = useState<AgentRuntimeSettingsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [placement, setPlacement] = useState<'dropdown-item' | 'chat-bottom'>('dropdown-item');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  // Handle click outside for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(openDropdowns).forEach(([key, isOpen]) => {
        if (isOpen && dropdownRefs.current[key] && !dropdownRefs.current[key]!.contains(event.target as Node)) {
          setOpenDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });
    };
    
    const hasOpenDropdowns = Object.values(openDropdowns).some(Boolean);
    if (hasOpenDropdowns) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdowns]);

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
    setOpenDropdowns({});
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
    return optionPlacement === 'chat-bottom';
  });

  // Get activated dropdown options that should also appear here
  const activatedDropdownOptions = activeOptions.filter(option => {
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
    // Use custom icon if specified
    if (property?.icon) {
      switch (property.icon) {
        case 'browser': return <TbBrowser className="w-3 h-3" />;
        case 'search': return <TbSearch className="w-3 h-3" />;
        case 'book': return <TbBook className="w-3 h-3" />;
        case 'bulb': return <TbBulb className="w-3 h-3" />;
        case 'brain': return <TbBrain className="w-3 h-3" />;
        default: return <TbSettings className="w-3 h-3" />;
      }
    }

    // Fallback to key/title-based detection
    const lowerKey = key.toLowerCase();
    const lowerTitle = (property?.title || '').toLowerCase();
    if (lowerKey.includes('browser') || lowerTitle.includes('browser'))
      return <TbBrowser className="w-3 h-3" />;
    if (lowerKey.includes('search')) return <TbSearch className="w-3 h-3" />;
    if (lowerKey.includes('research')) return <TbBook className="w-3 h-3" />;
    if (lowerKey.includes('foo')) return <TbBulb className="w-3 h-3" />;
    if (lowerKey.includes('thinking') || lowerTitle.includes('思考')) return <TbBrain className="w-3 h-3" />;
    return <TbSettings className="w-3 h-3" />;
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
        className="group inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer"
        title={`Remove ${option.title}`}
      >
        <span className="mr-1.5 text-blue-600 dark:text-blue-400 group-hover:opacity-0 transition-opacity duration-200">
          {getOptionIcon(option.key, property)}
        </span>
        <FiX className="absolute ml-0 w-3 h-3 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <span className="truncate flex items-center">
          <span className="font-medium">{option.title}</span>
          {option.displayValue && (
            <span className="ml-1.5 text-xs text-blue-600/80 dark:text-blue-300/80 bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded-full font-medium">
              {option.displayValue}
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderChatBottomOption = ([key, property]: [string, AgentRuntimeSettingProperty]) => {
    const currentValue = currentValues?.[key] ?? property.default;

    if (property.type === 'boolean') {
      return (
        <button
          key={`chat-bottom-${key}`}
          type="button"
          onClick={() => handleOptionChange(key, !currentValue)}
          disabled={isLoading || isDisabled}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            currentValue
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'
              : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={property.description || property.title || key}
        >
          <span className="mr-1.5 text-current">
            {getOptionIcon(key, property)}
          </span>
          <span className="font-medium">{property.title || key}</span>
          {isLoading && <FiLoader className="w-3 h-3 animate-spin ml-1.5" />}
          {currentValue && !isLoading && <FiCheck className="w-3 h-3 ml-1.5" />}
        </button>
      );
    }

    if (property.type === 'string' && property.enum) {
      const isOpen = openDropdowns[key] || false;
      const currentDisplayLabel = getEnumDisplayLabel(property, currentValue);
      
      return (
        <div key={`chat-bottom-${key}`} className="inline-flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {property.title || key}:
          </span>
          <div 
            className="relative" 
            ref={(el) => { dropdownRefs.current[key] = el; }}
          >
            <button
              type="button"
              onClick={() => setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }))}
              disabled={isLoading || isDisabled}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer"
            >
              <span className="font-medium">{currentDisplayLabel}</span>
              <FiChevronDown className={`w-3 h-3 ml-1.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                {property.enum.map((option) => {
                  const isSelected = currentValue === option;
                  const displayLabel = getEnumDisplayLabel(property, option);
                  
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        handleOptionChange(key, option);
                        setOpenDropdowns(prev => ({ ...prev, [key]: false }));
                      }}
                      disabled={isLoading || isDisabled}
                      className={`w-full px-3 py-2 text-left text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{displayLabel}</span>
                        {isSelected && <FiCheck className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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