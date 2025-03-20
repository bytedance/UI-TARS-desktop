import { ModelSettings } from '@agent-infra/shared';

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
