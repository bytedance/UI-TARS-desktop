import { useEffect } from 'react';
import {
  AppSettings,
  FileSystemSettings,
  ModelSettings,
  Provider,
} from './types';
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

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: Provider.OPENAI,
  model: 'gpt-4o',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
};

const DEFAULT_FILESYSTEM_SETTINGS: FileSystemSettings = {
  availableDirectories: [],
};

export const appSettingsAtom = atom<AppSettings>({
  model: DEFAULT_MODEL_SETTINGS,
  fileSystem: DEFAULT_FILESYSTEM_SETTINGS,
});

export function useAppSettings() {
  const [settings, setSettings] = useAtom<AppSettings>(appSettingsAtom);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedModelSettings = loadLLMSettings();
    const savedFileSystemSettings = loadFileSystemSettings();

    setSettings({
      model: savedModelSettings || DEFAULT_MODEL_SETTINGS,
      fileSystem: savedFileSystemSettings || DEFAULT_FILESYSTEM_SETTINGS,
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
    if (modelSettings.provider === Provider.AZURE_OPENAI) {
      if (modelSettings.endpoint) {
        // Validate endpoint format
        try {
          new URL(modelSettings.endpoint);
        } catch {
          return 'Invalid endpoint URL format';
        }
      }

      if (modelSettings.apiVersion) {
        // Validate API version format (YYYY-MM-DD)
        const apiVersionRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!apiVersionRegex.test(modelSettings.apiVersion)) {
          return 'API Version should be in YYYY-MM-DD format';
        }
      }
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

    try {
      // Save LLM settings
      saveLLMSettings(settings.model);
      await updateLLMConfig(settings.model);
      // Save file system settings
      saveFileSystemSettings(settings.fileSystem);
      await ipcClient.updateFileSystemConfig(settings.fileSystem);

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
