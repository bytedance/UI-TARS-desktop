import { useEffect, useState } from 'react';
import { ipcClient } from '@renderer/api';
import { isReportHtmlMode } from '@renderer/constants';

export function useFileSystemSettings() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isReportHtmlMode) {
      return;
    }
    async function initFileSystemSettings() {
      try {
        // Get current allowed directories from main process
        const allowedDirectories = await ipcClient.getAllowedDirectories();

        // Load settings from store
        const appSettings = await ipcClient.getSettings();
        const settings = appSettings?.fileSystem;

        // If no settings exist, create them with the allowed directories
        if (!settings) {
          await ipcClient.updateFileSystemSettings({
            availableDirectories: allowedDirectories,
          });
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
          await ipcClient.updateFileSystemSettings(updatedSettings);

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
