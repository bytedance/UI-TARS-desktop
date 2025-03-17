import { ModelSettings } from '../components/LeftSidebar/Settings/types';

const STORAGE_KEY = 'ai-model-settings';

/**
 * Load LLM settings from localStorage
 */
export function loadLLMSettings(): ModelSettings | null {
  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (e) {
    console.error('Failed to parse saved LLM settings', e);
  }
  return null;
}

/**
 * Save LLM settings to localStorage
 */
export function saveLLMSettings(settings: ModelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save LLM settings', e);
  }
}

/**
 * Get the current provider configuration based on settings
 */
export function getLLMProviderConfig(settings: ModelSettings) {
  const { provider, model, apiKey, apiVersion, endpoint, customModel } =
    settings;

  // For Azure, use the deployment name as the model
  const finalModel = provider === 'azure_openai' ? customModel : model;

  return {
    configName: provider,
    model: finalModel,
    apiKey,
    apiVersion,
    baseURL: endpoint,
  };
}
