import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAppDataDir, getDefaultBrowserUserDataDir } from './paths';

describe('paths utilities', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original platform
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
    process.env = originalEnv;
  });

  describe('getAppDataDir', () => {
    it('should return correct path for Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';

      const result = getAppDataDir('test-app');
      expect(result).toBe('C:\\Users\\TestUser\\AppData\\Roaming\\test-app');
    });

    it('should handle missing APPDATA on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      delete process.env.APPDATA;

      const result = getAppDataDir('test-app');
      expect(result).toContain('\\AppData\\Roaming\\test-app');
    });

    it('should return correct path for macOS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const result = getAppDataDir('test-app');
      expect(result).toContain('/Library/Application Support/test-app');
    });

    it('should return correct path for Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
      delete process.env.XDG_CONFIG_HOME;

      const result = getAppDataDir('test-app');
      expect(result).toContain('/.config/test-app');
    });

    it('should respect XDG_CONFIG_HOME on Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
      process.env.XDG_CONFIG_HOME = '/custom/config';

      const result = getAppDataDir('test-app');
      expect(result).toBe('/custom/config/test-app');
    });

    it('should fallback to home directory for unknown platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        configurable: true,
      });

      const result = getAppDataDir('test-app');
      expect(result).toContain('/.test-app');
    });
  });

  describe('getDefaultBrowserUserDataDir', () => {
    it('should return correct browser profile path', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const result = getDefaultBrowserUserDataDir('test-app');
      expect(result).toContain(
        '/Library/Application Support/test-app/browser-profiles/local-browser',
      );
    });

    it('should allow custom profile name', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const result = getDefaultBrowserUserDataDir('test-app', 'custom-profile');
      expect(result).toContain(
        '/Library/Application Support/test-app/browser-profiles/custom-profile',
      );
    });
  });
});
