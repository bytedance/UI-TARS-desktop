import { useState, useEffect } from 'react';
import { updateLLMConfig } from '../../../api/llmConfig';
import { ModelProvider, ModelSettings } from '@agent-infra/shared';
import { ipcClient } from '@renderer/api';

export function useModelSettings() {
  const [settings, setSettings] = useState<ModelSettings>({
    provider: ModelProvider.OPENAI,
    model: 'gpt-4o',
    apiKey: '',
    apiVersion: '',
    endpoint: '',
  });

  // Load settings from store on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await ipcClient.getSettings();
      setSettings(settings.model);
    }
    loadSettings();
  }, []);

  const saveSettings = async () => {
    // Save settings directly without modifying the model field
    const finalSettings = { ...settings };

    // Update LLM configuration in main process
    await updateLLMConfig(finalSettings);
  };

  return {
    settings,
    setSettings,
    saveSettings,
  };
}
