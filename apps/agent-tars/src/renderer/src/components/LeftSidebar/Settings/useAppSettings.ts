import { useEffect } from 'react';
import {
  AppSettings,
  FileSystemSettings,
  ModelSettings,
  ModelProvider,
  SearchSettings,
  SearchProvider,
} from '@agent-infra/shared';
import { ipcClient } from '@renderer/api';
import { atom, useAtom } from 'jotai';
import toast from 'react-hot-toast';

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: ModelProvider.ANTHROPIC,
  model: 'claude-3-7-sonnet-latest',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
};

const DEFAULT_FILESYSTEM_SETTINGS: FileSystemSettings = {
  availableDirectories: [],
};

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  provider: SearchProvider.TAVILY,
  apiKey: '',
};

export const appSettingsAtom = atom<AppSettings>({
  model: DEFAULT_MODEL_SETTINGS,
  fileSystem: DEFAULT_FILESYSTEM_SETTINGS,
  search: DEFAULT_SEARCH_SETTINGS,
});

export function useAppSettings() {
  const [settings, setSettings] = useAtom<AppSettings>(appSettingsAtom);

  // Load settings from store on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await ipcClient.getSettings();

      setSettings({
        model: settings.model || DEFAULT_MODEL_SETTINGS,
        fileSystem: settings.fileSystem || DEFAULT_FILESYSTEM_SETTINGS,
        search: settings.search || DEFAULT_SEARCH_SETTINGS,
      });
    }
    loadSettings();
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
    console.log('searchSettings.provider', searchSettings.provider);
    if (
      [SearchProvider.BING_SEARCH, SearchProvider.TAVILY].includes(
        searchSettings.provider,
      ) &&
      !searchSettings.apiKey
    ) {
      return `API Key is required for Search Provider "${searchSettings.provider}" `;
    }
    return null;
  };

  const validateSettings = () => {
    // Validate model settings
    const modelError = validateModelSettings(settings.model);
    if (modelError) {
      toast.error(modelError);
      return { hasError: true, errorTab: 'models' };
    }

    // Validate search settings
    const searchError = validateSearchSettings(settings.search);
    if (searchError) {
      toast.error(searchError);
      return { hasError: true, errorTab: 'search' };
    }

    return { hasError: false, errorTab: null };
  };

  const saveSettings = async () => {
    const validationResult = validateSettings();
    if (validationResult.hasError) {
      return false;
    }

    try {
      // Save all settings
      await ipcClient.updateAppSettings(settings);

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
    validateSettings,
  };
}
