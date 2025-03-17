import { useEffect, useState } from 'react';
import { ipcClient } from '@renderer/api';
import {
  loadFileSystemSettings,
  saveFileSystemSettings,
} from '@renderer/services/fileSystemSettings';

export function useFileSystemSettings() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initFileSystemSettings() {
      try {
        // Get current allowed directories from main process
        const allowedDirectories = await ipcClient.getAllowedDirectories();

        // Load settings from localStorage
        const settings = loadFileSystemSettings();

        // If no settings exist, create them with the allowed directories
        if (!settings) {
          saveFileSystemSettings({ availableDirectories: allowedDirectories });
        } else {
          // Make sure the settings match the main process
          const updatedSettings = {
            ...settings,
            availableDirectories: Array.from(
              new Set([
                ...settings.availableDirectories,
                ...allowedDirectories,
              ]),
            ),
          };

          // Save updated settings
          saveFileSystemSettings(updatedSettings);

          // Update main process if needed
          if (
            JSON.stringify(updatedSettings.availableDirectories) !==
            JSON.stringify(allowedDirectories)
          ) {
            await ipcClient.updateFileSystemConfig(updatedSettings);
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize file system settings:', error);
      }
    }

    initFileSystemSettings();
  }, []);

  return { initialized };
}
