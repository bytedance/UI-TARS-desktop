import { useEffect } from 'react';
import {
  AppSettings,
  FileSystemSettings,
  ModelSettings,
  ModelProvider,
  SearchSettings,
  SearchProvider,
} from '@agent-infra/shared';
import {
  loadLLMSettings,
  saveLLMSettings,
} from '../../../services/llmSettings';
import { updateLLMConfig } from '../../../api/llmConfig';
import {
  loadFileSystemSettings,
  saveFileSystemSettings,
} from '../../../services/fileSystemSettings';
import { ipcClient } from '@renderer/api';
import { atom, useAtom } from 'jotai';
import toast from 'react-hot-toast';
import {
  loadSearchSettings,
  saveSearchSettings,
} from '../../../services/searchSettings';

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: ModelProvider.OPENAI,
  model: 'gpt-4o',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
};

const DEFAULT_FILESYSTEM_SETTINGS: FileSystemSettings = {
  availableDirectories: [],
};

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  provider: SearchProvider.BING_SEARCH,
  apiKey: '',
};

export const appSettingsAtom = atom<AppSettings>({
  model: DEFAULT_MODEL_SETTINGS,
  fileSystem: DEFAULT_FILESYSTEM_SETTINGS,
  search: DEFAULT_SEARCH_SETTINGS,
});

export function useAppSettings() {
  const [settings, setSettings] = useAtom<AppSettings>(appSettingsAtom);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedModelSettings = loadLLMSettings();
    const savedFileSystemSettings = loadFileSystemSettings();
    const savedSearchSettings = loadSearchSettings();

    setSettings({
      model: savedModelSettings || DEFAULT_MODEL_SETTINGS,
      fileSystem: savedFileSystemSettings || DEFAULT_FILESYSTEM_SETTINGS,
      search: savedSearchSettings || DEFAULT_SEARCH_SETTINGS,
    });
  }, []);

  const validateModelSettings = (
    modelSettings: ModelSettings,
  ): string | null => {
    if (!modelSettings.provider) {
      return 'Provider is required';
    }
    if (!modelSettings.model) {
      return 'Model is required';
    }
    if (!modelSettings.apiKey) {
      return 'API Key is required';
    }

    // Azure OpenAI specific validations
    if (modelSettings.provider === ModelProvider.AZURE_OPENAI) {
      if (modelSettings.endpoint) {
        // Validate endpoint format
        try {
          new URL(modelSettings.endpoint);
        } catch {
          return 'Invalid endpoint URL format';
        }
      }
    }

    return null;
  };

  const validateSearchSettings = (
    searchSettings: SearchSettings,
  ): string | null => {
    if (!searchSettings.provider) {
      return 'Search provider is required';
    }
    if (!searchSettings.apiKey) {
      return 'API Key is required';
    }

    return null;
  };

  const saveSettings = async () => {
    // Validate model settings
    const modelError = validateModelSettings(settings.model);
    if (modelError) {
      toast.error(modelError);
      return false;
    }

    // Validate search settings
    const searchError = validateSearchSettings(settings.search);
    if (searchError) {
      toast.error(searchError);
      return false;
    }

    try {
      // Save all settings
      saveLLMSettings(settings.model);
      await updateLLMConfig(settings.model);

      saveFileSystemSettings(settings.fileSystem);
      await ipcClient.updateFileSystemConfig(settings.fileSystem);

      saveSearchSettings(settings.search);
      await ipcClient.updateSearchConfig(settings.search);

      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      toast.error('Failed to save settings: ' + (error as Error).message);
      return false;
    }
  };

  return {
    settings,
    setSettings,
    saveSettings,
  };
}
