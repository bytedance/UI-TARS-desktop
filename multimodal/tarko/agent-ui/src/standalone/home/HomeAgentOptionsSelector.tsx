import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { AgentOptionsSelector, AgentOptionsSelectorRef } from '@/standalone/chat/MessageInput/AgentOptionsSelector';
import { 
  globalRuntimeSettingsAtom,
  updateGlobalRuntimeSettingsAction,
  resetGlobalRuntimeSettingsAction 
} from '@/common/state/atoms/globalRuntimeSettings';
import { apiService } from '@/common/services/apiService';

export interface HomeAgentOptionsSelectorRef {
  getSelectedValues: () => Record<string, any>;
  resetValues: () => void;
}

interface HomeAgentOptionsSelectorProps {
  showAttachments?: boolean;
  onFileUpload?: () => void;
  className?: string;
}

export const HomeAgentOptionsSelector = forwardRef<
  HomeAgentOptionsSelectorRef,
  HomeAgentOptionsSelectorProps
>(({ showAttachments = true, onFileUpload, className }, ref) => {
  const [globalSettings] = useAtom(globalRuntimeSettingsAtom);
  const updateGlobalSettings = useSetAtom(updateGlobalRuntimeSettingsAction);
  const resetGlobalSettings = useSetAtom(resetGlobalRuntimeSettingsAction);
  const [hasDefaultSchema, setHasDefaultSchema] = useState(false);

  // Check if default schema is available on mount
  useEffect(() => {
    const checkDefaultSchema = async () => {
      try {
        const response = await apiService.getDefaultAgentOptionsSchema();
        setHasDefaultSchema(!!response.schema);
      } catch (error) {
        console.error('Failed to check default schema:', error);
        setHasDefaultSchema(false);
      }
    };

    checkDefaultSchema();
  }, []);

  useImperativeHandle(ref, () => ({
    getSelectedValues: () => globalSettings.selectedValues,
    resetValues: () => resetGlobalSettings(),
  }));

  // Create a virtual session metadata that contains our global settings
  const virtualSessionMetadata = {
    runtimeSettings: globalSettings.selectedValues,
  };

  const handleToggleOption = (key: string, value: any) => {
    if (value === undefined) {
      // Remove option
      const newValues = { ...globalSettings.selectedValues };
      delete newValues[key];
      resetGlobalSettings();
      // Reset and apply new values
      if (Object.keys(newValues).length > 0) {
        updateGlobalSettings(newValues);
      }
    } else {
      // Update option
      updateGlobalSettings({ [key]: value });
    }
  };

  // Don't render if no default schema available
  if (!hasDefaultSchema) {
    return null;
  }

  // Reuse existing AgentOptionsSelector with virtual session
  return (
    <AgentOptionsSelector
      activeSessionId="" // Empty string to get default schema
      sessionMetadata={virtualSessionMetadata}
      className={className}
      onToggleOption={handleToggleOption}
      showAttachments={showAttachments}
      onFileUpload={onFileUpload}
    />
  );
});