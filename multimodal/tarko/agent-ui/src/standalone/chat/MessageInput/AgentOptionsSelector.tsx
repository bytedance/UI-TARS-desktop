import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiPlus, FiCheck, FiChevronRight, FiImage, FiPaperclip, FiLoader } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbPhoto, TbBrowser } from 'react-icons/tb';
import { Dropdown, DropdownItem, DropdownHeader, DropdownDivider } from '@tarko/ui';
import { createPortal } from 'react-dom';

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

interface AgentOptionsSchema {
  type: string;
  properties: Record<string, any>;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      <button
      ref={triggerRef}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group flex w-full items-center rounded-lg px-2.5 py-1.5 text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-900 dark:text-gray-100 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
      }`}
      disabled={disabled}
      >
        {trigger}
        <FiChevronRight className="ml-1.5 w-3.5 h-3.5 text-gray-400" />
      </button>

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
      onToggleOption,
      showAttachments = true,
      onFileUpload,
      isDisabled = false,
      isProcessing: isProcessingProp = false,
    },
    ref,
  ) => {
    const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
    const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
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
          setSchema(response.schema);
          setCurrentValues(response.currentValues);
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
      setIsLoading(false);
    }, [activeSessionId]);

    // Handle option change - with loading state for agent recreation
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

          // Show success feedback briefly
          console.log('Agent options updated successfully', { key, value });
        }
      } catch (error) {
        console.error('Failed to update runtime settings:', error);
        // Revert on error
        setCurrentValues(currentValues);
      } finally {
        // Add a small delay to show the loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }

      // Notify parent
      if (onToggleOption) {
        onToggleOption(key, value);
      }
    };

    // Handle option removal - clear to undefined to remove from active options
    const handleOptionRemove = async (key: string) => {
      if (!activeSessionId || isLoading || !currentValues) return;

      const newValues = { ...currentValues };
      delete newValues[key]; // Remove the key entirely
      setCurrentValues(newValues);
      setIsLoading(true);

      try {
        const response = await apiService.updateSessionRuntimeSettings(activeSessionId, newValues);
        if (response.success && response.sessionInfo?.metadata) {
          updateSessionMetadata({
            sessionId: activeSessionId,
            metadata: response.sessionInfo.metadata,
          });

          console.log('Agent option removed successfully', { key });
        }
      } catch (error) {
        console.error('Failed to remove runtime setting:', error);
        // Revert on error
        setCurrentValues(currentValues);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
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
            displayValue: property.type === 'string' && property.enum ? currentValue : undefined,
          };
        });

      onActiveOptionsChange(activeOptions);
    }, [schema, currentValues, onActiveOptionsChange]);

    // Don't render if in replay mode or processing
    if (isReplayMode || isProcessingProp) {
      return null;
    }

    // Always show the button, even if no schema options available
    const options = schema?.properties
      ? Object.entries(schema.properties).map(([key, property]) => ({
          key,
          property,
          currentValue: currentValues?.[key] ?? property.default,
        }))
      : [];

    const getOptionIcon = (key: string, property: any) => {
      const lowerKey = key.toLowerCase();
      const lowerTitle = (property.title || '').toLowerCase();
      if (lowerKey.includes('browser') || lowerTitle.includes('browser')) return <TbBrowser className="w-4 h-4" />;
      if (lowerKey.includes('search')) return <TbSearch className="w-4 h-4" />;
      if (lowerKey.includes('research')) return <TbBook className="w-4 h-4" />;
      if (lowerKey.includes('foo')) return <TbBulb className="w-4 h-4" />;
      if (lowerKey.includes('thinking')) return <TbBrain className="w-4 h-4" />;
      return <TbSettings className="w-4 h-4" />;
    };

    const renderOptionItem = (config: AgentOptionConfig) => {
      const { key, property, currentValue } = config;

      if (property.type === 'boolean') {
        return (
          <DropdownItem
            key={key}
            icon={getOptionIcon(key, property)}
            onClick={() => handleOptionChange(key, !currentValue)}
            className={`${currentValue ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{property.title || key}</div>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <FiLoader className="w-3 h-3 animate-spin text-blue-600" />}
                {currentValue && !isLoading && <FiCheck className="w-4 h-4 text-blue-600" />}
              </div>
            </div>
          </DropdownItem>
        );
      }

      if (property.type === 'string' && property.enum) {
        // Use submenu for enum options
        const submenuTrigger = (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center min-w-0 flex-1">
              {getOptionIcon(key, property)}
              <div className="ml-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-sm truncate">{property.title || key}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                    {currentValue || property.default}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLoading && <FiLoader className="w-3 h-3 animate-spin text-blue-600" />}
            </div>
          </div>
        );

        const submenuItems = property.enum.map((option: any) => {
          const isSelected = currentValue === option;

          return (
            <DropdownItem
              key={option}
              onClick={() => handleOptionChange(key, option)}
              className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{option}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isSelected && !isLoading && <FiCheck className="w-4 h-4 text-blue-600" />}
                </div>
              </div>
            </DropdownItem>
          );
        });

        return (
          <DropdownSubMenu key={key} trigger={submenuTrigger} disabled={isLoading}>
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
            disabled={isLoading || isDisabled}
            className={`flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isLoading ? 'animate-pulse' : ''
            }`}
            title={isLoading ? 'Updating agent options...' : 'Options'}
          >
            {isLoading ? <FiLoader size={16} className="animate-spin" /> : <FiPlus size={16} />}
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
