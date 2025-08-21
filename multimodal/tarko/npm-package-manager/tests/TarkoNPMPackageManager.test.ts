/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TarkoNPMPackageManager } from '../src/TarkoNPMPackageManager';
import * as path from 'path';
import * as os from 'os';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock tar
vi.mock('tar', () => ({
  extract: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('TarkoNPMPackageManager', () => {
  let packageManager: TarkoNPMPackageManager;

  beforeEach(() => {
    packageManager = new TarkoNPMPackageManager();
    vi.clearAllMocks();
  });

  describe('parseAgentInput', () => {
    it('should identify HTTP URLs', () => {
      expect(packageManager.parseAgentInput('https://example.com/agent.js')).toBe('http-url');
      expect(packageManager.parseAgentInput('http://example.com/agent.js')).toBe('http-url');
    });

    it('should identify local paths', () => {
      expect(packageManager.parseAgentInput('./agent.js')).toBe('local-path');
      expect(packageManager.parseAgentInput('../agent.js')).toBe('local-path');
      expect(packageManager.parseAgentInput('/absolute/path')).toBe('local-path');
      expect(packageManager.parseAgentInput('relative/path')).toBe('local-path');
    });

    it('should identify NPM packages', () => {
      expect(packageManager.parseAgentInput('@scope/package')).toBe('npm-package');
      expect(packageManager.parseAgentInput('package-name')).toBe('npm-package');
      expect(packageManager.parseAgentInput('tarko-agent')).toBe('npm-package');
      expect(packageManager.parseAgentInput('simple')).toBe('npm-package');
    });

    it('should return unknown for invalid inputs', () => {
      expect(packageManager.parseAgentInput('invalid@package')).toBe('unknown');
      expect(packageManager.parseAgentInput('')).toBe('unknown');
    });
  });

  describe('resolvePackageName', () => {
    it('should use full package names as-is', async () => {
      const mockFetch = await import('node-fetch');
      vi.mocked(mockFetch.default).mockResolvedValue({
        ok: true,
      } as any);

      const result = await packageManager.resolvePackageName('@scope/package');
      expect(result).toBe('@scope/package');
    });

    it('should try tarko- prefix first for shortcut syntax', async () => {
      const mockFetch = await import('node-fetch');
      
      // First call (tarko-agent) succeeds
      vi.mocked(mockFetch.default)
        .mockResolvedValueOnce({ ok: true } as any);

      const result = await packageManager.resolvePackageName('agent');
      expect(result).toBe('tarko-agent');
      expect(mockFetch.default).toHaveBeenCalledWith(
        'https://registry.npmjs.org/tarko-agent',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('should fallback to original name if tarko- prefix fails', async () => {
      const mockFetch = await import('node-fetch');
      
      // First call (tarko-agent) fails, second call (agent) succeeds
      vi.mocked(mockFetch.default)
        .mockResolvedValueOnce({ ok: false } as any)
        .mockResolvedValueOnce({ ok: true } as any);

      const result = await packageManager.resolvePackageName('agent');
      expect(result).toBe('agent');
      expect(mockFetch.default).toHaveBeenCalledTimes(2);
    });

    it('should throw if neither package exists', async () => {
      const mockFetch = await import('node-fetch');
      
      // Both calls fail
      vi.mocked(mockFetch.default)
        .mockResolvedValue({ ok: false } as any);

      await expect(packageManager.resolvePackageName('nonexistent'))
        .rejects.toThrow("Package 'nonexistent' not found in NPM registry");
    });
  });

  describe('createAgentImplementation', () => {
    it('should create valid AgentImplementation', async () => {
      const mockFetch = await import('node-fetch');
      const mockFs = await import('fs');
      
      // Mock package validation
      vi.mocked(mockFetch.default).mockResolvedValue({ ok: true } as any);
      
      // Mock registry read (no existing package)
      vi.mocked(mockFs.promises.readFile).mockRejectedValue(new Error('File not found'));
      
      // Mock package metadata fetch
      vi.mocked(mockFetch.default).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              name: 'test-package',
              version: '1.0.0',
              main: 'index.js',
              dist: {
                tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
                shasum: 'abc123',
              },
            },
          },
        }),
      } as any);

      // Mock tarball download
      vi.mocked(mockFetch.default).mockResolvedValueOnce({
        ok: true,
        body: {
          pipe: vi.fn(),
        },
      } as any);

      // Mock tar extraction
      const mockTar = await import('tar');
      vi.mocked(mockTar.extract).mockReturnValue({
        on: vi.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      } as any);

      // Mock dynamic import for validation
      vi.doMock(path.resolve(expect.any(String), 'index.js'), () => ({
        default: function TestAgent() {},
      }), { virtual: true });

      const result = await packageManager.createAgentImplementation('test-package');
      
      expect(result).toEqual({
        type: 'modulePath',
        label: 'test-package@1.0.0',
        value: expect.stringContaining('index.js'),
      });
    });
  });
});
