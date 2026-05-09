import { AgentSettings } from '@/lib/types';

export const DEFAULT_MODEL = 'gpt-4o';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;

export const MODELS = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-opus-4.1',
  'claude-sonnet-4',
];

export const DEFAULT_SETTINGS: AgentSettings = {
  model: DEFAULT_MODEL,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  enableBrowser: true,
  enableThinking: false,
  browserTimeout: 30000,
};

export function validateApiKey(key: string): boolean {
  return key.length > 0 && !key.includes(' ');
}

export function validateSettings(settings: AgentSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!settings.apiKey) errors.push('API key is required');
  if (!settings.model) errors.push('Model is required');
  if (settings.temperature < 0 || settings.temperature > 2) {
    errors.push('Temperature must be between 0 and 2');
  }
  if (settings.maxTokens < 1 || settings.maxTokens > 128000) {
    errors.push('Max tokens must be between 1 and 128000');
  }
  
  return { valid: errors.length === 0, errors };
}
