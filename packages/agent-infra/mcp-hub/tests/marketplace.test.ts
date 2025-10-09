import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Marketplace, getMarketplace } from '../src/marketplace.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock global fetch
global.fetch = vi.fn();
global.URL = URL; // Polyfill URL for tests

// Mock sample registry data
const mockRegistryData = {
  version: '1.0.0',
  generatedAt: Date.now(),
  totalServers: 3,
  servers: [
    {
      id: 'context7',
      name: 'Context7',
      description: 'Up-to-date code documentation for LLMs.',
      author: 'upstash',
      url: 'https://github.com/upstash/context7', // Example GitHub URL
      category: 'development',
      tags: ['documentation', 'code-examples'],
      installations: [],
      featured: true,
      verified: true,
      stars: 16084,
      lastCommit: 1750923365,
      updatedAt: 1751265038,
    },
    {
      id: 'filesystem',
      name: 'File System',
      description: 'Provides comprehensive filesystem operations.',
      author: 'modelcontextprotocol',
      url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', // Example GitHub URL
      category: 'development',
      tags: ['filesystem', 'file-management'],
      installations: [],
      featured: false,
      verified: true,
      stars: 56765,
      lastCommit: 1751257963,
      updatedAt: 1751265038,
    },
    {
      id: 'sequentialthinking',
      name: 'Sequential Thinking',
      description: 'A structured problem-solving tool.',
      author: 'modelcontextprotocol',
      url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking', // Example GitHub URL
      category: 'development',
      tags: ['problem-solving'],
      installations: [],
      featured: false,
      verified: true,
      stars: 123,
      lastCommit: 1751257000,
      updatedAt: 1751265038,
    },
  ],
};

const mockReadmeContent =
  '# Test Server Readme\nThis is the content of the README file.';
const mockReadmeUrl =
  'https://raw.githubusercontent.com/upstash/context7/main/README.md';
const mockReadmeUrlFallback =
  'https://raw.githubusercontent.com/upstash/context7/master/README.md';

describe('Marketplace', () => {
  let marketplace;
  let mockCacheDir;

  beforeEach(async () => {
    // Setup mock cache directory
    mockCacheDir = path.join(os.tmpdir(), '.mcp-hub-test', 'cache');
    await fs.mkdir(mockCacheDir, { recursive: true });

    // Create marketplace instance with test config
    marketplace = new Marketplace(1000); // 1 second TTL for testing
    marketplace.cacheFile = path.join(mockCacheDir, 'marketplace.json');

    // Reset fetch mock
    fetch.mockReset();

    // Mock exec for curl fallback to always succeed for 'curl --version'
    vi.mock('child_process', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        exec: vi.fn((cmd) => {
          if (cmd.includes('curl --version')) {
            return Promise.resolve({ stdout: 'curl 7.x.x', stderr: '' });
          }
          // For actual curl calls, use a generic success for now
          return Promise.resolve({ stdout: '{}', stderr: '' });
        }),
      };
    });
  });

  afterEach(async () => {
    // Cleanup mock cache directory
    await fs.rm(mockCacheDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
  describe('getCatalog', () => {
    it('should fetch and cache registry when cache is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      const result = await marketplace.getCatalog();

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://ravitemer.github.io/mcp-registry/registry.json',
        {},
      );

      // Verify cache was written with new structure
      const cacheContent = JSON.parse(
        await fs.readFile(marketplace.cacheFile, 'utf-8'),
      );
      expect(cacheContent.registry.servers).toHaveLength(3);
      expect(cacheContent.lastFetchedAt).toBeGreaterThan(0);
    });

    it('should use cached registry when valid', async () => {
      // First call to populate cache
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      await marketplace.getCatalog();

      // Second call should use cache
      const result = await marketplace.getCatalog();

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle search filter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      const result = await marketplace.getCatalog({ search: 'file' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('File System');
    });

    it('should handle category filter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      const result = await marketplace.getCatalog({ category: 'development' });

      expect(result).toHaveLength(3); // All in mock data are 'development'
    });

    it('should handle sorting by stars', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      const result = await marketplace.getCatalog({ sort: 'stars' });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('filesystem'); // 56765 stars
      expect(result[1].id).toBe('context7'); // 16084 stars
      expect(result[2].id).toBe('sequentialthinking'); // 123 stars
    });

    it('should handle sorting by newest (lastCommit)', async () => {
      // Ensure data is sorted by lastCommit in mockRegistryData
      const sortedRegistryData = {
        ...mockRegistryData,
        servers: [...mockRegistryData.servers].sort(
          (a, b) => (b.lastCommit || 0) - (a.lastCommit || 0),
        ),
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sortedRegistryData,
      });

      const result = await marketplace.getCatalog({ sort: 'newest' });

      expect(result).toHaveLength(3);
      // The mockRegistryData in the test file is already sorted by lastCommit desc.
      // filesystem (1751257963), sequentialthinking (1751257000), context7 (1750923365)
      expect(result[0].id).toBe('filesystem');
      expect(result[1].id).toBe('sequentialthinking');
      expect(result[2].id).toBe('context7');
    });

    it('should handle sorting by name', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      const result = await marketplace.getCatalog({ sort: 'name' });

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Context7');
      expect(result[1].name).toBe('File System');
      expect(result[2].name).toBe('Sequential Thinking');
    });
  });
  describe('getServerDetails', () => {
    it('should fetch and cache server documentation', async () => {
      // Mock registry fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      // Mock README fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockReadmeContent,
      });

      const result = await marketplace.getServerDetails('context7');

      expect(result.server.id).toBe('context7');
      expect(result.readmeContent).toBe(mockReadmeContent);
      expect(fetch).toHaveBeenCalledTimes(2); // Once for registry, once for README
      expect(fetch).toHaveBeenCalledWith(mockReadmeUrl, {});

      // Verify cache was written
      const cacheContent = JSON.parse(
        await fs.readFile(marketplace.cacheFile, 'utf-8'),
      );
      expect(cacheContent.serverDocumentation['context7'].content).toBe(
        mockReadmeContent,
      );
      expect(
        cacheContent.serverDocumentation['context7'].lastFetchedAt,
      ).toBeGreaterThan(0);
    });

    it('should use cached server documentation when valid', async () => {
      // First, populate cache with registry and documentation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockReadmeContent,
      });
      await marketplace.getServerDetails('context7');

      // Second call should use cached documentation AND cached registry
      const result = await marketplace.getServerDetails('context7');

      expect(result.server.id).toBe('context7');
      expect(result.readmeContent).toBe(mockReadmeContent);
      // Both registry and documentation should be cached, so no additional fetch calls
      expect(fetch).toHaveBeenCalledTimes(2); // 2 calls from the first getServerDetails
    });

    it('should return null readmeContent if documentation cannot be fetched', async () => {
      // Mock registry fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      // Mock README fetch failures for both main and master branches
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const result = await marketplace.getServerDetails('context7');

      expect(result.server.id).toBe('context7');
      expect(result.readmeContent).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(3); // Registry + two README attempts
    });

    it('should return undefined if server is not found in registry', async () => {
      // Mock registry fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      const result = await marketplace.getServerDetails('non-existent-server');
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1); // Only registry fetch
    });
  });

  describe('error handling', () => {
    it('should handle network errors during registry fetch', async () => {
      // Mock both fetch and curl to fail
      fetch.mockRejectedValueOnce(
        new Error('Network error during registry fetch'),
      );

      // Mock exec for curl to also fail
      const { exec } = await import('child_process');
      const execMock = vi.mocked(exec);
      execMock.mockImplementationOnce((cmd, callback) => {
        callback(new Error('curl: command not found'));
      });

      await expect(marketplace.getCatalog()).rejects.toThrow(
        'Failed to fetch marketplace registry',
      );
    }, 10000);
    it('should handle invalid API responses (missing servers array)', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '1.0.0', generatedAt: 123 }), // Missing 'servers'
      });

      await expect(marketplace.getCatalog()).rejects.toThrow(
        'Failed to fetch marketplace registry',
      );
    });

    it('should handle HTTP errors during registry fetch', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(marketplace.getCatalog()).rejects.toThrow(
        'Failed to fetch marketplace registry',
      );
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getMarketplace();
      const instance2 = getMarketplace();

      expect(instance1).toBe(instance2);
    });

    it('should respect custom TTL', () => {
      const instance = getMarketplace(2000);
      expect(instance.ttl).toBe(2000);
    });
  });
});
