import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { apiService } from '@/common/services/apiService';
import {
  AgentRuntimeSettingsSchema,
  AgentRuntimeSettingProperty,
} from '@tarko/interface';
import { 
  globalRuntimeSettingsAtom,
  updateGlobalRuntimeSettingsAction,
} from '@/common/state/atoms/globalRuntimeSettings';
import { FiCheck, FiLoader, FiChevronDown } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbBrowser } from 'react-icons/tb';
import { Dropdown, DropdownItem } from '@tarko/ui';

interface HomeChatBottomSettingsProps {
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export const HomeChatBottomSettings: React.FC<HomeChatBottomSettingsProps> = ({
  isDisabled = false,
  isProcessing = false,
}) => {
  const [schema, setSchema] = useState<AgentRuntimeSettingsSchema | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [globalSettings] = useAtom(globalRuntimeSettingsAtom);
  const updateGlobalSettings = useSetAtom(updateGlobalRuntimeSettingsAction);

  // Load schema from system endpoint (no session needed)
  useEffect(() => {
    if (hasLoaded) return;

    const loadSchema = async () => {
      try {
        const response = await apiService.getSessionRuntimeSettings(); // No sessionId = schema only
        const schema = response.schema as AgentRuntimeSettingsSchema;
        setSchema(schema);
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load runtime settings schema:', error);
      }
    };

    loadSchema();
  }, [hasLoaded]);

  // Helper function to check if an option should be visible
  const isOptionVisible = (key: string, property: AgentRuntimeSettingProperty): boolean => {
    if (!property.visible) {
      return true; // Always visible if no condition
    }

    const { dependsOn, when } = property.visible;
    const dependentValue = globalSettings.selectedValues[dependsOn];
    
    return dependentValue === when;
  };

  // Handle option change
  const handleOptionChange = (key: string, value: any) => {
    updateGlobalSettings({ [key]: value });
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

  const getOptionIcon = (key: string, property?: AgentRuntimeSettingProperty) => {
    // Use custom icon if specified
    if (property?.icon) {
      switch (property.icon) {
        case 'browser':
          return <TbBrowser className="w-3.5 h-3.5" />;
        case 'search':
          return <TbSearch className="w-3.5 h-3.5" />;
        case 'book':
          return <TbBook className="w-3.5 h-3.5" />;
        case 'bulb':
          return <TbBulb className="w-3.5 h-3.5" />;
        case 'brain':
          return <TbBrain className="w-3.5 h-3.5" />;
        default:
          return <TbSettings className="w-3.5 h-3.5" />;
      }
    }

    // Fallback to key/title-based detection
    const lowerKey = key.toLowerCase();
    const lowerTitle = (property?.title || '').toLowerCase();
    if (lowerKey.includes('browser') || lowerTitle.includes('browser'))
      return <TbBrowser className="w-3.5 h-3.5" />;
    if (lowerKey.includes('search')) return <TbSearch className="w-3.5 h-3.5" />;
    if (lowerKey.includes('research')) return <TbBook className="w-3.5 h-3.5" />;
    if (lowerKey.includes('foo')) return <TbBulb className="w-3.5 h-3.5" />;
    if (lowerKey.includes('thinking') || lowerTitle.includes('思考'))
      return <TbBrain className="w-3.5 h-3.5" />;
    return <TbSettings className="w-3.5 h-3.5" />;
  };

  // Don't render if processing or no schema
  if (isProcessing || !schema?.properties || Object.keys(schema.properties).length === 0) {
    return null;
  }

  // Get all options that should appear in chat-bottom
  const chatBottomOptions = Object.entries(schema.properties).filter(([key, property]) => {
    const optionPlacement = property.placement || 'dropdown-item';
    const isVisible = isOptionVisible(key, property);
    return optionPlacement === 'chat-bottom' && isVisible;
  });

  // Don't render if no options to show
  if (chatBottomOptions.length === 0) {
    return null;
  }

  const renderChatBottomOption = ([key, property]: [string, AgentRuntimeSettingProperty]) => {
    const currentValue = globalSettings.selectedValues[key] ?? property.default;

    if (property.type === 'boolean') {
      return (
        <button
          key={`home-chat-bottom-${key}`}
          type="button"
          onClick={() => handleOptionChange(key, !currentValue)}
          disabled={isDisabled}
          className={`inline-flex items-center px-2.5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            currentValue
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
              : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={property.description || property.title || key}
        >
          <span className="mr-1.5 text-current">{getOptionIcon(key, property)}</span>
          <span className="font-medium">{property.title || key}</span>
          {currentValue && <FiCheck className="w-3.5 h-3.5 ml-1.5" />}
        </button>
      );
    }

    if (property.type === 'string' && property.enum) {
      const currentDisplayLabel = getEnumDisplayLabel(property, currentValue);

      return (
        <Dropdown
          key={`home-chat-bottom-${key}`}
          placement="top-start"
          trigger={
            <button
              type="button"
              disabled={isDisabled}
              className={`inline-flex items-center px-2.5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                isDisabled
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
              <FiChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400 dark:text-gray-500" />
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
                className={isSelected ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{displayLabel}</span>
                  {isSelected && <FiCheck className="w-4 h-4 text-indigo-600" />}
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
      {chatBottomOptions.map(renderChatBottomOption)}
    </div>
  );
};