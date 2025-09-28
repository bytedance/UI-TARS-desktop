import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
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
import { FiPlus, FiCheck, FiChevronRight, FiImage, FiPaperclip, FiLoader } from 'react-icons/fi';
import { TbPhoto } from 'react-icons/tb';
import { Dropdown, DropdownItem, DropdownHeader, DropdownDivider } from '@tarko/ui';
import { createPortal } from 'react-dom';
import { getAgentOptionIcon } from './agentIconUtils';

interface ActiveOption {
  key: string;
  title: string;
  currentValue: any;
  displayValue?: string;
}

interface AgentOptionsSelectorProps {
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  className?: string;
  onActiveOptionsChange?: (options: ActiveOption[]) => void;
  onSchemaChange?: (hasOptions: boolean) => void;
  onToggleOption?: (key: string, currentValue: any) => void;
  showAttachments?: boolean;
  onFileUpload?: () => void;
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export interface AgentOptionsSelectorRef {
  toggleOption: (key: string) => void;
  removeOption: (key: string) => void;
}

interface RuntimeSettingsResponse {
  schema: AgentRuntimeSettingsSchema;
  currentValues: Record<string, any>;
}

interface AgentOptionConfig {
  key: string;
  property: any;
  currentValue: any;
}

// Sub-menu component for enum options
interface DropdownSubMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

const DropdownSubMenu: React.FC<DropdownSubMenuProps> = ({
  trigger,
  children,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Check if mouse is moving to submenu
    const submenu = submenuRef.current;
    if (submenu) {
      const submenuRect = submenu.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // If mouse is within submenu bounds or moving towards it, don't close
      if (
        mouseX >= submenuRect.left - 10 &&
        mouseX <= submenuRect.right + 10 &&
        mouseY >= submenuRect.top - 10 &&
        mouseY <= submenuRect.bottom + 10
      ) {
        return;
      }
    }

    // Delay closing to allow mouse to reach submenu
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const submenuContent = isOpen ? (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

      {/* Submenu */}
      <div
        ref={submenuRef}
        className="fixed z-50 w-48 rounded-xl bg-white dark:bg-gray-900 shadow-lg shadow-black/5 dark:shadow-black/40 border border-gray-300/80 dark:border-gray-600/80 overflow-hidden backdrop-blur-sm"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-1">{children}</div>
      </div>
    </>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
      >
        <div className="relative">
          {trigger}
          <FiChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>

      {typeof document !== 'undefined' &&
        submenuContent &&
        createPortal(submenuContent, document.body)}
    </>
  );
};

export const AgentOptionsSelector = forwardRef<AgentOptionsSelectorRef, AgentOptionsSelectorProps>(
  (
    {
      activeSessionId,
      sessionMetadata,
      className = '',
      onActiveOptionsChange,
      onSchemaChange,
      onToggleOption,
      showAttachments = true,
      onFileUpload,
      isDisabled = false,
      isProcessing: isProcessingProp = false,
    },
    ref,
  ) => {
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
          let response: RuntimeSettingsResponse;

          // Special handling for home page placeholder
          if (activeSessionId === 'home-placeholder') {
            // For home page, get only schema without session
            response = await apiService.getSessionRuntimeSettings();
          } else {
            // For real sessions, get schema + current values
            response = await apiService.getSessionRuntimeSettings(activeSessionId);
          }

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
          // Use default placement - let UI handle this
          setPlacement('dropdown-item');
          setHasLoaded(true);
        } catch (error) {
          console.error('Failed to load runtime settings:', error);
        }
      };

      loadOptions();
    }, [activeSessionId, isReplayMode]); // NO hasLoaded dependency to prevent loop

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

    // Helper function to get enum display label
    const getEnumDisplayLabel = (property: AgentRuntimeSettingProperty, value: string): string => {
      if (property.enumLabels && property.enum) {
        const index = property.enum.indexOf(value);
        if (index >= 0 && index < property.enumLabels.length) {
          return property.enumLabels[index];
        }
      }
      return value;
    };

    // Handle option change - with loading state for agent recreation
    const handleOptionChange = async (key: string, value: any) => {
      if (!activeSessionId || loadingOptions.has(key) || !currentValues) return;

      const newValues = { ...currentValues, [key]: value };
      setCurrentValues(newValues);
      setLoadingOptions((prev) => new Set(prev).add(key));

      try {
        // Skip server update for home placeholder - only update local state
        if (activeSessionId === 'home-placeholder') {
          // For home page, just update local state
          console.log('Home page agent option updated', { key, value });
        } else {
          // For real sessions, update server
          const response = await apiService.updateSessionRuntimeSettings(
            activeSessionId,
            newValues,
          );
          if (response.success && response.sessionInfo?.metadata) {
            updateSessionMetadata({
              sessionId: activeSessionId,
              metadata: response.sessionInfo.metadata,
            });

            // Show success feedback briefly
            console.log('Agent options updated successfully', { key, value });
          }
        }
      } catch (error) {
        console.error('Failed to update runtime settings:', error);
        // Revert on error
        setCurrentValues(currentValues);
      } finally {
        // Add a small delay to show the loading state
        setTimeout(() => {
          setLoadingOptions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }, 500);
      }

      // Notify parent
      if (onToggleOption) {
        onToggleOption(key, value);
      }
    };

    // Handle option removal - clear to undefined to remove from active options
    const handleOptionRemove = async (key: string) => {
      if (!activeSessionId || loadingOptions.has(key) || !currentValues) return;

      const newValues = { ...currentValues };
      delete newValues[key]; // Remove the key entirely
      setCurrentValues(newValues);
      setLoadingOptions((prev) => new Set(prev).add(key));

      try {
        // Skip server update for home placeholder - only update local state
        if (activeSessionId === 'home-placeholder') {
          // For home page, just update local state
          console.log('Home page agent option removed', { key });
        } else {
          // For real sessions, update server
          const response = await apiService.updateSessionRuntimeSettings(
            activeSessionId,
            newValues,
          );
          if (response.success && response.sessionInfo?.metadata) {
            updateSessionMetadata({
              sessionId: activeSessionId,
              metadata: response.sessionInfo.metadata,
            });

            console.log('Agent option removed successfully', { key });
          }
        }
      } catch (error) {
        console.error('Failed to remove runtime setting:', error);
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

      // Notify parent
      if (onToggleOption) {
        onToggleOption(key, undefined);
      }
    };

    // Expose toggle method
    useImperativeHandle(ref, () => ({
      toggleOption: (key: string) => {
        if (!schema?.properties || !currentValues) return;

        const property = schema.properties[key];
        if (!property) return;

        const currentValue = currentValues[key] ?? property.default;

        if (property.type === 'boolean') {
          handleOptionChange(key, !currentValue);
        } else if (property.type === 'string' && property.enum) {
          // For enum, cycle to the next value
          const currentIndex = property.enum.indexOf(currentValue);
          const nextIndex = (currentIndex + 1) % property.enum.length;
          const nextValue = property.enum[nextIndex];
          handleOptionChange(key, nextValue);
        }
      },
      removeOption: (key: string) => {
        handleOptionRemove(key);
      },
    }));

    // Calculate and notify active options
    useEffect(() => {
      if (!onActiveOptionsChange || !schema || !currentValues) return;

      const activeOptions = Object.entries(schema.properties)
        .filter(([key, property]) => {
          // Check visibility first
          if (!isOptionVisible(key, property)) return false;

          // Only show options that are explicitly set (not using default values)
          const hasExplicitValue = key in currentValues;
          if (!hasExplicitValue) return false;

          const currentValue = currentValues[key];
          if (property.type === 'boolean') {
            return currentValue === true;
          }
          if (property.type === 'string' && property.enum) {
            // Show enum options only if they differ from default
            return currentValue !== property.default;
          }
          return false;
        })
        .map(([key, property]) => {
          const currentValue = currentValues[key];
          return {
            key,
            title: property.title || key,
            currentValue,
            displayValue:
              property.type === 'string' && property.enum
                ? getEnumDisplayLabel(property, currentValue)
                : undefined,
          };
        });

      onActiveOptionsChange(activeOptions);
    }, [schema, currentValues, onActiveOptionsChange]);

    // Notify parent about schema availability
    useEffect(() => {
      if (onSchemaChange) {
        const hasOptions = schema?.properties && Object.keys(schema.properties).length > 0;
        onSchemaChange(!!hasOptions);
      }
    }, [schema, onSchemaChange]);

    // Don't render if in replay mode, processing, or not dropdown placement
    if (
      isReplayMode ||
      isProcessingProp ||
      !schema?.properties ||
      Object.keys(schema.properties).length === 0
    ) {
      return null;
    }

    // Filter options that should appear in dropdown (not chat-bottom)
    const dropdownOptions = Object.entries(schema.properties).filter(([key, property]) => {
      const optionPlacement = property.placement || placement;
      const isVisible = isOptionVisible(key, property);
      return optionPlacement === 'dropdown-item' && isVisible;
    });

    // Don't render if no dropdown options
    if (dropdownOptions.length === 0) {
      return null;
    }

    // Only show the button when dropdown options are available
    const options = dropdownOptions.map(([key, property]) => ({
      key,
      property,
      currentValue: currentValues?.[key] ?? property.default,
    }));

    const getOptionIcon = (key: string, property: AgentRuntimeSettingProperty) => {
      return getAgentOptionIcon(key, property);
    };

    const renderOptionItem = (config: AgentOptionConfig) => {
      const { key, property, currentValue } = config;
      const isOptionLoading = loadingOptions.has(key);

      if (property.type === 'boolean') {
        return (
          <DropdownItem
            key={key}
            icon={getOptionIcon(key, property)}
            onClick={() => handleOptionChange(key, !currentValue)}
            className={`${currentValue ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isOptionLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{property.title || key}</div>
              </div>
              <div className="flex items-center gap-2">
                {isOptionLoading && <FiLoader className="w-3 h-3 animate-spin text-blue-600" />}
                {currentValue && !isOptionLoading && <FiCheck className="w-4 h-4 text-blue-600" />}
              </div>
            </div>
          </DropdownItem>
        );
      }

      if (property.type === 'string' && property.enum) {
        // Generate submenu items first
        const submenuItems = property.enum.map((option: string) => {
          const isSelected = currentValue === option;
          const displayLabel = getEnumDisplayLabel(property, option);

          return (
            <DropdownItem
              key={option}
              onClick={() => handleOptionChange(key, option)}
              className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isOptionLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{displayLabel}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isSelected && !isOptionLoading && <FiCheck className="w-4 h-4 text-blue-600" />}
                </div>
              </div>
            </DropdownItem>
          );
        });

        // Use DropdownItem with submenu for enum options to match layout
        return (
          <DropdownSubMenu
            key={key}
            trigger={
              <DropdownItem
                icon={getOptionIcon(key, property)}
                disabled={isOptionLoading}
                className={`${isOptionLoading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{property.title || key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {getEnumDisplayLabel(property, currentValue || property.default)}
                    </span>
                    {isOptionLoading && <FiLoader className="w-3 h-3 animate-spin text-blue-600" />}
                  </div>
                </div>
              </DropdownItem>
            }
            disabled={isOptionLoading}
          >
            {submenuItems}
          </DropdownSubMenu>
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
            disabled={loadingOptions.size > 0 || isDisabled}
            className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              loadingOptions.size > 0 ? 'animate-pulse' : ''
            }`}
            title={loadingOptions.size > 0 ? 'Updating agent options...' : 'Options'}
          >
            {loadingOptions.size > 0 ? (
              <FiLoader size={16} className="animate-spin" />
            ) : (
              <FiPlus size={16} />
            )}
          </button>
        }
      >
        {/* File upload option */}
        {showAttachments && (
          <DropdownItem
            icon={<TbPhoto className="w-4 h-4" />}
            onClick={onFileUpload}
            disabled={isDisabled}
          >
            <div className="font-medium text-sm">Add Images</div>
          </DropdownItem>
        )}

        {/* Separator between upload and agent settings */}
        {showAttachments && options.length > 0 && <DropdownDivider />}

        {/* Agent options */}
        {options.map(renderOptionItem)}
      </Dropdown>
    );
  },
);
