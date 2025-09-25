import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { ChatBottomSettings } from '@/standalone/chat/MessageInput/ChatBottomSettings';
import {
  globalRuntimeSettingsAtom,
  updateGlobalRuntimeSettingsAction,
} from '@/common/state/atoms/globalRuntimeSettings';

interface HomeChatBottomSettingsProps {
  isDisabled?: boolean;
  isProcessing?: boolean;
}

export const HomeChatBottomSettings: React.FC<HomeChatBottomSettingsProps> = ({
  isDisabled = false,
  isProcessing = false,
}) => {
  const [globalSettings] = useAtom(globalRuntimeSettingsAtom);
  const updateGlobalSettings = useSetAtom(updateGlobalRuntimeSettingsAction);

  // Create a virtual session metadata that contains our global settings
  const virtualSessionMetadata = {
    runtimeSettings: globalSettings.selectedValues,
  };

  const handleRemoveOption = (key: string) => {
    // Remove option from global settings
    const newValues = { ...globalSettings.selectedValues };
    delete newValues[key];
    updateGlobalSettings(newValues);
  };

  // Custom option change handler for home page
  const handleOptionChange = (key: string, value: any) => {
    updateGlobalSettings({ [key]: value });
  };

  // For home page, we reuse ChatBottomSettings with placeholder session
  // This ensures consistent behavior and avoids code duplication
  return (
    <ChatBottomSettings
      activeSessionId="home-placeholder" // Special placeholder for home page
      sessionMetadata={virtualSessionMetadata}
      activeOptions={[]} // No activated dropdown options on home page
      onRemoveOption={handleRemoveOption}
      onOptionChange={handleOptionChange} // Custom handler for global settings
      isDisabled={isDisabled}
      isProcessing={isProcessing}
    />
  );
};