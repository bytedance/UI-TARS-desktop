import { useState, useEffect } from 'react';
import { ModelSettings, Provider } from './types';
import {
  loadLLMSettings,
  saveLLMSettings,
} from '../../../services/llmSettings';
import { updateLLMConfig } from '../../../api/llmConfig';

export function useModelSettings() {
  const [settings, setSettings] = useState<ModelSettings>({
    provider: Provider.OPENAI,
    model: 'gpt-4o',
    apiKey: '',
    apiVersion: '',
    endpoint: '',
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = loadLLMSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const saveSettings = async () => {
    // Save settings directly without modifying the model field
    const finalSettings = { ...settings };

    // Save to localStorage
    saveLLMSettings(finalSettings);

    // Update LLM configuration in main process
    await updateLLMConfig(finalSettings);
  };

  return {
    settings,
    setSettings,
    saveSettings,
  };
}
