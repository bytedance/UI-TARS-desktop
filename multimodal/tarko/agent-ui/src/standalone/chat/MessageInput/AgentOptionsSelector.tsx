import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { FiPlus, FiCheck, FiChevronRight, FiImage, FiPaperclip, FiLoader, FiX } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbPhoto } from 'react-icons/tb';
import { Dialog, DialogPanel, DialogTitle, Dropdown, DropdownItem, DropdownDivider } from '@tarko/ui';

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
  showAttachments?: boolean;
  onFileUpload?: () => void;
  isDisabled?: boolean;
  isProcessing?: boolean;
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
      isProcessing: isProcessingProp = false
    },
    ref,
  ) => {
    const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
    const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isAgentOptionsModalOpen, setIsAgentOptionsModalOpen] = useState(false);
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

    // Reset loaded state when session changes
    useEffect(() => {
      setHasLoaded(false);
      setSchema(null);
      setCurrentValues(null);
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
          handleOptionChange(key, property.default);
        }
      },
    }));

    // Calculate and notify active options
    useEffect(() => {
      if (!onActiveOptionsChange || !schema || !currentValues) return;

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
        .map(([key, property]) => ({
          key,
          title: property.title || key,
          currentValue: currentValues[key] ?? property.default,
        }));

      onActiveOptionsChange(activeOptions);
    }, [schema, currentValues, onActiveOptionsChange]);

    // Don't render if in replay mode or processing
    if (isReplayMode || isProcessingProp) {
      return null;
    }

    // Always show the button, even if no schema options available
    const options = schema?.properties ? Object.entries(schema.properties).map(([key, property]) => ({
      key,
      property,
      currentValue: currentValues?.[key] ?? property.default,
    })) : [];

    const getOptionIcon = (key: string, property: any) => {
      const lowerKey = key.toLowerCase();
      const lowerTitle = (property.title || '').toLowerCase();
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
          <div
            key={key}
            onClick={() => handleOptionChange(key, !currentValue)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
              currentValue ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
            } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-blue-600 dark:text-blue-400">
                {getOptionIcon(key, property)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{property.title || key}</div>
                {property.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{property.description}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <FiLoader className="w-4 h-4 animate-spin text-blue-600" />}
              {currentValue && !isLoading && <FiCheck className="w-5 h-5 text-blue-600" />}
            </div>
          </div>
        );
      }

      if (property.type === 'string' && property.enum) {
        // Render each enum value as a separate option item
        return property.enum.map((option: any) => {
          const isSelected = currentValue === option;
          const optionKey = `${key}-${option}`;
          
          return (
            <div
              key={optionKey}
              onClick={() => handleOptionChange(key, option)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
              } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-blue-600 dark:text-blue-400">
                  {getOptionIcon(key, property)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{option}</div>
                  {property.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{property.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <FiLoader className="w-4 h-4 animate-spin text-blue-600" />}
                {isSelected && !isLoading && <FiCheck className="w-5 h-5 text-blue-600" />}
              </div>
            </div>
          );
        });
      }

      return null;
    };

    return (
    <>
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
    {isLoading ? (
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
    <div className="font-medium text-sm">添加照片和文件</div>
    </DropdownItem>
    )}
    
    {/* Individual agent options in dropdown */}
    {options.map(config => {
    const { key, property, currentValue } = config;
    
    if (property.type === 'boolean') {
    return (
        <DropdownItem
        key={key}
          icon={getOptionIcon(key, property)}
            onClick={() => handleOptionChange(key, !currentValue)}
              className={`${currentValue ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
              <div className="flex items-center justify-between w-full">
                <div className="font-medium text-sm">{property.title || key}</div>
              {isLoading && <FiLoader className="w-3 h-3 animate-spin text-blue-600" />}
            {currentValue && !isLoading && <FiCheck className="w-4 h-4 text-blue-600" />}
        </div>
        </DropdownItem>
      );
    }
    
    return null;
    }).filter(Boolean)}
    
    {/* More options that opens modal */}
    {options.some(config => config.property.type === 'string' && config.property.enum) && (
    <>
    <DropdownDivider />
    <DropdownItem
    icon={<TbSettings className="w-4 h-4" />}
    onClick={() => setIsAgentOptionsModalOpen(true)}
    disabled={isDisabled}
    >
      <div className="flex items-center justify-between w-full">
          <div className="font-medium text-sm">更多</div>
            <FiChevronRight className="w-4 h-4" />
            </div>
              </DropdownItem>
        </>
      )}
    </Dropdown>

    {/* Agent Options Modal - only for enum options */}
    <Dialog open={isAgentOptionsModalOpen} onClose={() => setIsAgentOptionsModalOpen(false)}>
    <DialogPanel className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg p-6">
    <DialogTitle className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
    Agent Options
    </DialogTitle>
    <div className="space-y-3">
    {options
    .filter(config => config.property.type === 'string' && config.property.enum)
    .map(config => {
      const { key, property, currentValue } = config;
        
          return property.enum?.map((option: any) => {
              const isSelected = currentValue === option;
                const optionKey = `${key}-${option}`;
                  
                    return (
                      <div
                        key={optionKey}
                        onClick={() => {
                          handleOptionChange(key, option);
                          setIsAgentOptionsModalOpen(false);
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
                        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-blue-600 dark:text-blue-400">
                            {getOptionIcon(key, property)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{option}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLoading && <FiLoader className="w-4 h-4 animate-spin text-blue-600" />}
                          {isSelected && !isLoading && <FiCheck className="w-5 h-5 text-blue-600" />}
                        </div>
                      </div>
                    );
                  });
                })
                .flat()}
              
              {/* No enum options message */}
              {!options.some(config => config.property.type === 'string' && config.property.enum) && (
                <div className="text-center py-8">
                  <TbSettings className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No additional options available</p>
                </div>
              )}
            </div>
          </DialogPanel>
        </Dialog>
      </>
    );
  },
);
