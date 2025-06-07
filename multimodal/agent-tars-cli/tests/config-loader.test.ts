/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { deepMerge, loadTarsConfig } from '../src/config/loader';
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';

// Create typed mock for Response
interface MockResponse {
  ok: boolean;
  statusText?: string;
  headers: {
    get: (name: string) => string | null;
  };
  json: () => Promise<any>;
  text: () => Promise<string>;
}

// Mock node-fetch
vi.mock('node-fetch');
const mockFetch = fetch as MockedFunction<typeof fetch>;

/**
 * Test suite for the config/loader module
 *
 * These tests verify:
 * 1. deepMerge function correctly merges objects
 * 2. loadTarsConfig properly loads from remote URLs
 * 3. Multiple configurations are merged correctly
 * 4. Error handling works as expected
 */
describe('Config Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deep merge nested objects', () => {
      const target = { a: 1, nested: { x: 1, y: 2 } };
      const source = { b: 2, nested: { y: 3, z: 4 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 3, z: 4 } });
    });

    it('should handle arrays by replacing them', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      expect(result).toEqual({ items: [4, 5] });
    });
  });

  describe('loadTarsConfig', () => {
    it('should load remote config from URL', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue({ model: { provider: 'test-provider' } }),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await loadTarsConfig(['https://example.com/config.json'], true);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config.json');
      expect(result).toEqual({ model: { provider: 'test-provider' } });
    });

    it('should handle text response from remote config', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('text/plain'),
        },
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('{"model":{"provider":"text-provider"}}'),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await loadTarsConfig(['https://example.com/config.txt'], true);

      expect(result).toEqual({ model: { provider: 'text-provider' } });
    });

    it('should merge multiple configs with later ones taking precedence', async () => {
      // Setup mocks for two remote configs
      const mockResponse1: MockResponse = {
        ok: true,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          model: { provider: 'provider1', id: 'model1' },
          search: { provider: 'browser_search' },
        }),
        text: vi.fn().mockResolvedValue(''),
      };

      const mockResponse2: MockResponse = {
        ok: true,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          model: { provider: 'provider2' },
          browser: { headless: false },
        }),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as unknown as Response)
        .mockResolvedValueOnce(mockResponse2 as unknown as Response);

      const result = await loadTarsConfig(
        ['https://example.com/config1.json', 'https://example.com/config2.json'],
        true,
      );

      // Expect the result to be a merge with config2 values taking precedence
      expect(result).toEqual({
        model: { provider: 'provider2', id: 'model1' },
        search: { provider: 'browser_search' },
        browser: { headless: false },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when loading remote configs', async () => {
      // First config loads successfully
      const mockResponse1: MockResponse = {
        ok: true,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ setting: 'value1' }),
        text: vi.fn().mockResolvedValue(''),
      };

      // Second config fails
      const mockResponse2: MockResponse = {
        ok: false,
        statusText: 'Not Found',
        headers: { get: vi.fn() },
        json: vi.fn(),
        text: vi.fn(),
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as unknown as Response)
        .mockResolvedValueOnce(mockResponse2 as unknown as Response);

      // Set up console.error mock to prevent test output noise
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadTarsConfig(
        ['https://example.com/config1.json', 'https://example.com/config2.json'],
        true,
      );

      // We should still get the first config
      expect(result).toEqual({ setting: 'value1' });

      // Error should have been logged
      expect(mockConsoleError).toHaveBeenCalled();

      // Restore console.error
      mockConsoleError.mockRestore();
    });

    it('should return empty config when no config paths provided', async () => {
      // Mock @multimodal/config-loader to throw error for auto-discovery
      vi.doMock('@multimodal/config-loader', () => ({
        loadConfig: vi.fn().mockRejectedValue(new Error('No config found')),
      }));

      const result = await loadTarsConfig(undefined, true);

      expect(result).toEqual({});
    });

    it('should return empty config when config array is empty', async () => {
      const result = await loadTarsConfig([], true);

      expect(result).toEqual({});
    });
  });
});
