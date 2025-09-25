import React, { forwardRef, useImperativeHandle } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  AgentOptionsSelector,
  AgentOptionsSelectorRef,
} from '@/standalone/chat/MessageInput/AgentOptionsSelector';
import {
  globalRuntimeSettingsAtom,
  updateGlobalRuntimeSettingsAction,
  resetGlobalRuntimeSettingsAction,
} from '@/common/state/atoms/globalRuntimeSettings';

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

  // For home page, we need to use a placeholder session to get schema
  // This is a limitation of the current AgentOptionsSelector design
  // TODO: Extract schema loading logic to be independent of session
  return (
    <AgentOptionsSelector
      activeSessionId="home-placeholder" // Special placeholder for home page
      sessionMetadata={virtualSessionMetadata}
      className={className}
      onToggleOption={handleToggleOption}
      showAttachments={showAttachments}
      onFileUpload={onFileUpload}
    />
  );
});
