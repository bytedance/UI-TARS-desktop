import { ipcClient } from './index';
import { ModelSettings } from '@agent-infra/shared';

/**
 * Update the LLM configuration in the main process
 */
export async function updateLLMConfig(
  settings: ModelSettings,
): Promise<boolean> {
  try {
    return await ipcClient.updateLLMConfig(settings);
  } catch (error) {
    console.error('Failed to update LLM configuration:', error);
    return false;
  }
}

/**
 * Get available LLM providers from the main process
 */
export async function getAvailableProviders(): Promise<string[]> {
  try {
    return await ipcClient.getAvailableProviders();
  } catch (error) {
    console.error('Failed to get available providers:', error);
    return [];
  }
}
