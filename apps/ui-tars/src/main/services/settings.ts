/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ipcMain } from 'electron';
import { SettingStore } from '../store/setting';
import { logger } from '../logger';
import { LocalStore } from '@main/store/validate';

export function registerSettingsHandlers() {
  /**
   * Get setting
   */
  ipcMain.handle('setting:get', () => {
    return SettingStore.getStore();
  });

  /**
   * Clear setting
   */
  ipcMain.handle('setting:clear', () => {
    SettingStore.clear();
  });

  /**
   * Reset setting preset
   */
  ipcMain.handle('setting:resetPreset', () => {
    SettingStore.getInstance().delete('presetSource');
  });

  /**
   * Update setting
   */
  ipcMain.handle('setting:update', async (_, settings: LocalStore) => {
    SettingStore.setStore(settings);
  });

  /**
   * Import setting preset from text
   */
  ipcMain.handle('setting:importPresetFromText', async (_, yamlContent) => {
    try {
      const newSettings = await SettingStore.importPresetFromText(yamlContent);
      SettingStore.setStore(newSettings);
    } catch (error) {
      logger.error('Failed to import preset:', error);
      throw error;
    }
  });

  /**
   * Import setting preset from url
   */
  ipcMain.handle('setting:importPresetFromUrl', async (_, url, autoUpdate) => {
    try {
      await SettingStore.validatePresetUrl(url);
      const newSettings = await SettingStore.fetchPresetFromUrl(url);
      SettingStore.setStore({
        ...newSettings,
        presetSource: {
          type: 'remote',
          url: url,
          autoUpdate: autoUpdate,
          lastUpdated: Date.now(),
        },
      });
    } catch (error) {
      logger.error('Failed to import preset from URL:', error);
      throw error;
    }
  });

  /**
   * Update setting preset from url
   */
  ipcMain.handle('setting:updatePresetFromRemote', async () => {
    const settings = SettingStore.getStore();
    if (settings.presetSource?.type === 'remote' && settings.presetSource.url) {
      const newSettings = await SettingStore.fetchPresetFromUrl(
        settings.presetSource.url,
      );
      SettingStore.setStore({
        ...newSettings,
        presetSource: {
          type: 'remote',
          url: settings.presetSource.url,
          autoUpdate: settings.presetSource.autoUpdate,
          lastUpdated: Date.now(),
        },
      });
    } else {
      throw new Error('No remote preset configured');
    }
  });
}
