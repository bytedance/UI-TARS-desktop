/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import ElectronStore from 'electron-store';
import yaml from 'js-yaml';
import dns from 'dns/promises';
import net from 'net';

import * as env from '@main/env';
import { logger } from '@main/logger';

import {
  LocalStore,
  SearchEngineForSettings,
  VLMProviderV2,
  Operator,
} from './types';
import { validatePreset } from './validate';
import { BrowserWindow } from 'electron';

export const DEFAULT_SETTING: LocalStore = {
  language: 'en',
  vlmProvider: (env.vlmProvider as VLMProviderV2) || '',
  vlmBaseUrl: env.vlmBaseUrl || '',
  vlmApiKey: env.vlmApiKey || '',
  vlmModelName: env.vlmModelName || '',
  useResponsesApi: false,
  maxLoopCount: 100,
  loopIntervalInMs: 1000,
  searchEngineForBrowser: SearchEngineForSettings.GOOGLE,
  operator: Operator.LocalComputer,
  reportStorageBaseUrl: '',
  utioBaseUrl: '',
};

export class SettingStore {
  private static readonly PRESET_FETCH_TIMEOUT_MS = 10_000;
  private static readonly PRESET_MAX_BYTES = 1024 * 1024;
  private static instance: ElectronStore<LocalStore>;

  public static getInstance(): ElectronStore<LocalStore> {
    if (!SettingStore.instance) {
      SettingStore.instance = new ElectronStore<LocalStore>({
        name: 'ui_tars.setting',
        defaults: DEFAULT_SETTING,
      });

      SettingStore.instance.onDidAnyChange((newValue, oldValue) => {
        logger.log(
          `SettingStore: ${JSON.stringify(oldValue)} changed to ${JSON.stringify(newValue)}`,
        );
        // Notify that value updated
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('setting-updated', newValue);
        });
      });
    }
    return SettingStore.instance;
  }

  public static set<K extends keyof LocalStore>(
    key: K,
    value: LocalStore[K],
  ): void {
    SettingStore.getInstance().set(key, value);
  }

  public static setStore(state: LocalStore): void {
    SettingStore.getInstance().set(state);
  }

  public static get<K extends keyof LocalStore>(key: K): LocalStore[K] {
    return SettingStore.getInstance().get(key);
  }

  public static remove<K extends keyof LocalStore>(key: K): void {
    SettingStore.getInstance().delete(key);
  }

  public static getStore(): LocalStore {
    return SettingStore.getInstance().store;
  }

  public static clear(): void {
    SettingStore.getInstance().set(DEFAULT_SETTING);
  }

  public static openInEditor(): void {
    SettingStore.getInstance().openInEditor();
  }

  private static isLocalHostname(hostname: string): boolean {
    const lower = hostname.toLowerCase().replace(/\.+$/, '');
    return lower === 'localhost' || lower.endsWith('.localhost');
  }

  private static isPrivateOrLocalIp(ip: string): boolean {
    const normalizedIp = ip.split('%')[0];
    const version = net.isIP(normalizedIp);
    if (version === 4) {
      const parts = normalizedIp.split('.').map((part) => Number(part));
      if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
        return false;
      }
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      return false;
    }

    if (version === 6) {
      const normalized = normalizedIp.toLowerCase();
      if (normalized === '::1' || normalized === '::') return true;
      if (normalized.startsWith('fe80:')) return true;
      if (normalized.startsWith('fc') || normalized.startsWith('fd'))
        return true;
      if (normalized.startsWith('::ffff:')) {
        const mapped = normalized.replace('::ffff:', '');
        return SettingStore.isPrivateOrLocalIp(mapped);
      }
    }

    return false;
  }

  public static async validatePresetUrl(input: string): Promise<URL> {
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      throw new Error('Invalid preset URL');
    }

    if (parsed.protocol !== 'https:') {
      throw new Error('Preset URL must use HTTPS');
    }

    if (!parsed.hostname || SettingStore.isLocalHostname(parsed.hostname)) {
      throw new Error('Preset URL host is not allowed');
    }

    try {
      const rawHost = parsed.hostname;
      const bracketlessHost =
        rawHost.startsWith('[') && rawHost.endsWith(']')
          ? rawHost.slice(1, -1)
          : rawHost;
      const normalizedHost = bracketlessHost.split('%')[0];
      const ipVersion = net.isIP(normalizedHost);
      const addresses = ipVersion
        ? [{ address: normalizedHost }]
        : await dns.lookup(normalizedHost, { all: true });

      if (!addresses.length) {
        throw new Error('Preset URL host cannot be resolved');
      }

      for (const { address } of addresses) {
        if (SettingStore.isPrivateOrLocalIp(address)) {
          throw new Error('Preset URL resolves to a private or local address');
        }
      }
    } catch (error) {
      throw new Error(
        `Preset URL host validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return parsed;
  }

  private static async readResponseTextWithLimit(
    response: Response,
    maxBytes: number,
  ): Promise<string> {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = Number(contentLength);
      if (Number.isFinite(size) && size > maxBytes) {
        throw new Error('Preset response is too large');
      }
    }

    if (!response.body) {
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > maxBytes) {
        throw new Error('Preset response is too large');
      }
      return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let received = 0;
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        throw new Error('Preset response is too large');
      }
      result += decoder.decode(value, { stream: true });
    }

    result += decoder.decode();
    return result;
  }

  public static async importPresetFromUrl(
    url: string,
    autoUpdate = false,
  ): Promise<void> {
    try {
      const newSettings = await SettingStore.fetchPresetFromUrl(url);
      SettingStore.setStore({
        ...newSettings,
        presetSource: {
          type: 'remote',
          url,
          autoUpdate,
          lastUpdated: Date.now(),
        },
      });
    } catch (error) {
      logger.error(error);
      throw new Error(
        `Failed to import preset: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  public static async importPresetFromText(
    yamlContent: string,
  ): Promise<LocalStore> {
    try {
      const settings = await parsePresetYaml(yamlContent);
      return settings;
    } catch (error) {
      logger.error('Failed to import preset from text:', error);
      throw error;
    }
  }

  private static async fetchPresetResponse(
    validatedUrl: URL,
  ): Promise<Response> {
    let currentUrl = validatedUrl;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        SettingStore.PRESET_FETCH_TIMEOUT_MS,
      );
      let response: Response;
      try {
        response = await fetch(currentUrl.toString(), {
          signal: controller.signal,
          redirect: 'manual',
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        response.body?.cancel();
        if (!location) {
          throw new Error('Preset URL redirect missing location');
        }
        const nextUrl = new URL(location, currentUrl);
        currentUrl = await SettingStore.validatePresetUrl(nextUrl.toString());
        continue;
      }

      return response;
    }

    throw new Error('Too many redirects when fetching preset');
  }

  public static async fetchPresetFromUrl(url: string): Promise<LocalStore> {
    try {
      const validatedUrl = await SettingStore.validatePresetUrl(url);
      const response = await SettingStore.fetchPresetResponse(validatedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch preset: ${response.status}`);
      }

      const yamlContent = await SettingStore.readResponseTextWithLimit(
        response,
        SettingStore.PRESET_MAX_BYTES,
      );
      return await this.importPresetFromText(yamlContent);
    } catch (error) {
      logger.error('Failed to fetch preset from URL:', error);
      throw error;
    }
  }
}

async function parsePresetYaml(yamlContent: string): Promise<LocalStore> {
  const preset = yaml.load(yamlContent);
  const validatedPreset = validatePreset(preset);
  return validatedPreset;
}
