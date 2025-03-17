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

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: Provider.OPENAI,
  model: 'gpt-4o',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
  customModel: '',
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

  const saveSettings = async () => {
    // Save LLM settings
    saveLLMSettings(settings.model);
    await updateLLMConfig(settings.model);

    // Save file system settings
    saveFileSystemSettings(settings.fileSystem);
    await ipcClient.updateFileSystemConfig(settings.fileSystem);

    return true;
  };

  return {
    settings,
    setSettings,
    saveSettings,
  };
}
