import { useEffect, useRef } from 'react';
import {
  AppSettings,
  ModelSettings,
  ModelProvider,
  SearchSettings,
  SearchProvider,
} from '@agent-infra/shared';
import { ipcClient } from '@renderer/api';
import { isReportHtmlMode } from '@renderer/constants';
import { atom, useAtom } from 'jotai';
import toast from 'react-hot-toast';
import {
  DEFAULT_SETTINGS,
  DEFAULT_MODEL_SETTINGS,
  DEFAULT_FILESYSTEM_SETTINGS,
  DEFAULT_SEARCH_SETTINGS,
  DEFAULT_MCP_SETTINGS,
} from '@shared/constants';

export const appSettingsAtom = atom<AppSettings>(DEFAULT_SETTINGS);

export function useAppSettings() {
  const [settings, setSettings] = useAtom<AppSettings>(appSettingsAtom);
  const intiializationRef = useRef(false);

  // Load settings from store on mount
  useEffect(() => {
    if (isReportHtmlMode) {
      return;
    }
    // Listen for settings changes from main process and update local value.
    if (!intiializationRef.current) {
      // eslint-disable-next-line no-inner-declarations
      const loadSettings = async () => {
        const settings = await ipcClient.getSettings();
        console.log(`[Setting] initial value`, settings);
        setSettings({
          model: settings.model || DEFAULT_MODEL_SETTINGS,
          fileSystem: settings.fileSystem || DEFAULT_FILESYSTEM_SETTINGS,
          search: settings.search || DEFAULT_SEARCH_SETTINGS,
          mcp: settings.mcp || DEFAULT_MCP_SETTINGS,
        });
      };

      loadSettings();
      const settingUpdatedListener = (newSettings: AppSettings) => {
        console.log(`[Setting] store updated`, newSettings);
        setSettings(newSettings);
      };

      window.api.on('setting-updated', settingUpdatedListener);
      intiializationRef.current = true;
      return () => {
        window.api.off('setting-updated', settingUpdatedListener);
      };
    }

    return () => {};
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
      [SearchProvider.BingSearch, SearchProvider.Tavily].includes(
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
      await ipcClient.updateAppSettings(settings);
      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      toast.error('Failed to save settings: ' + (error as Error).message);
      return false;
    }
  };

  const resetToDefaults = async () => {
    try {
      // Preserve the directory settings from current settings
      const currentDirectories = settings.fileSystem.availableDirectories;

      const defaultSettings = { ...DEFAULT_SETTINGS };
      // Keep the current file system directories
      defaultSettings.fileSystem = {
        ...DEFAULT_FILESYSTEM_SETTINGS,
        availableDirectories: currentDirectories,
      };

      setSettings(defaultSettings);
      await ipcClient.updateAppSettings(defaultSettings);
      toast.success('Settings reset to defaults');
      return true;
    } catch (error) {
      toast.error('Failed to reset settings: ' + (error as Error).message);
      return false;
    }
  };

  return {
    settings,
    setSettings,
    saveSettings,
    validateSettings,
    resetToDefaults,
  };
}
