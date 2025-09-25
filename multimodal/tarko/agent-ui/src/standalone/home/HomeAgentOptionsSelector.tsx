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
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Create a temporary session to get default schema
  useEffect(() => {
    const createTempSession = async () => {
      if (tempSessionId || isCreatingSession) return;
      
      setIsCreatingSession(true);
      try {
        // Create a temporary session without runtime settings to get default schema
        const session = await apiService.createSession();
        setTempSessionId(session.sessionId);
      } catch (error) {
        console.error('Failed to create temporary session for schema:', error);
      } finally {
        setIsCreatingSession(false);
      }
    };

    createTempSession();
  }, [tempSessionId, isCreatingSession]);

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

  // Don't render until we have a temp session
  if (!tempSessionId) {
    return null;
  }

  // Reuse existing AgentOptionsSelector with temp session
  return (
    <AgentOptionsSelector
      activeSessionId={tempSessionId}
      sessionMetadata={virtualSessionMetadata}
      className={className}
      onToggleOption={handleToggleOption}
      showAttachments={showAttachments}
      onFileUpload={onFileUpload}
    />
  );
});