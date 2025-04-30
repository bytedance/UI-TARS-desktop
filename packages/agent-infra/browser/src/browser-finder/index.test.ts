/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserFinder } from '..';
import { getAnyEdgeStable } from 'edge-paths';
import { getAnyChromeStable } from './chrome-paths';
import { getAnyFirefoxStable } from './firefox-paths';

vi.mock('edge-paths');
vi.mock('./chrome-paths');
vi.mock('./firefox-paths');

describe('BrowserFinder', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    infoWithData: vi.fn(),
    spawn: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  };

  const originalPlatform = process.platform;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock successful browser paths
    vi.mocked(getAnyChromeStable).mockReturnValue('/path/to/chrome');
    vi.mocked(getAnyEdgeStable).mockReturnValue('/path/to/edge');
    vi.mocked(getAnyFirefoxStable).mockReturnValue('/path/to/firefox');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  it('should use provided logger', () => {
    const finder = new BrowserFinder(mockLogger);
    finder.findBrowser('chrome');
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should find Chrome browser', () => {
    const finder = new BrowserFinder(mockLogger);
    const data = finder.findBrowser('chrome');

    expect(data.path).toBe('/path/to/chrome');
    expect(data.type).toBe('chrome');
    expect(getAnyChromeStable).toHaveBeenCalled();
  });

  it('should find Edge browser', () => {
    const finder = new BrowserFinder(mockLogger);
    const data = finder.findBrowser('edge');

    expect(data.path).toBe('/path/to/edge');
    expect(data.type).toBe('edge');
    expect(getAnyEdgeStable).toHaveBeenCalled();
  });

  it('should find Firefox browser', () => {
    const finder = new BrowserFinder(mockLogger);
    const data = finder.findBrowser('firefox');

    expect(data.path).toBe('/path/to/firefox');
    expect(data.type).toBe('firefox');
    expect(getAnyFirefoxStable).toHaveBeenCalled();
  });

  it('should throw error for unsupported platform', () => {
    Object.defineProperty(process, 'platform', {
      value: 'aix',
    });

    const finder = new BrowserFinder(mockLogger);
    expect(() => finder.findBrowser()).toThrow('Unsupported platform: aix');
  });

  describe('findAnyBrowser fallback logic', () => {
    it('should try Chrome first', () => {
      const finder = new BrowserFinder(mockLogger);
      const data = finder.findBrowser();

      expect(data.path).toBe('/path/to/chrome');
      expect(data.type).toBe('chrome');
      expect(getAnyChromeStable).toHaveBeenCalled();
      expect(getAnyEdgeStable).not.toHaveBeenCalled();
      expect(getAnyFirefoxStable).not.toHaveBeenCalled();
    });

    it('should fallback to Edge if Chrome fails', () => {
      vi.mocked(getAnyChromeStable).mockImplementation(() => {
        throw new Error('Chrome not found');
      });

      const finder = new BrowserFinder(mockLogger);
      const data = finder.findBrowser();

      expect(data.path).toBe('/path/to/edge');
      expect(data.type).toBe('edge');
      expect(getAnyChromeStable).toHaveBeenCalled();
      expect(getAnyEdgeStable).toHaveBeenCalled();
      expect(getAnyFirefoxStable).not.toHaveBeenCalled();
    });

    it('should fallback to Firefox if Chrome and Edge fail', () => {
      vi.mocked(getAnyChromeStable).mockImplementation(() => {
        throw new Error('Chrome not found');
      });
      vi.mocked(getAnyEdgeStable).mockImplementation(() => {
        throw new Error('Edge not found');
      });

      const finder = new BrowserFinder(mockLogger);
      const data = finder.findBrowser();

      expect(data.path).toBe('/path/to/firefox');
      expect(data.type).toBe('firefox');
      expect(getAnyChromeStable).toHaveBeenCalled();
      expect(getAnyEdgeStable).toHaveBeenCalled();
      expect(getAnyFirefoxStable).toHaveBeenCalled();
    });

    it('should throw error if no browser is found', () => {
      vi.mocked(getAnyChromeStable).mockImplementation(() => {
        throw new Error('Chrome not found');
      });
      vi.mocked(getAnyEdgeStable).mockImplementation(() => {
        throw new Error('Edge not found');
      });
      vi.mocked(getAnyFirefoxStable).mockImplementation(() => {
        throw new Error('Firefox not found');
      });

      const finder = new BrowserFinder(mockLogger);
      expect(() => finder.findBrowser()).toThrow('Unable to find any browser.');
    });
  });

  describe('error handling', () => {
    it('should throw and log error when Chrome lookup fails', () => {
      vi.mocked(getAnyChromeStable).mockImplementation(() => {
        throw new Error('Chrome error');
      });

      const finder = new BrowserFinder(mockLogger);
      expect(() => finder.findBrowser('chrome')).toThrow('Chrome error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Find Chrome Error:',
        expect.any(Error),
      );
    });

    it('should throw and log error when Edge lookup fails', () => {
      vi.mocked(getAnyEdgeStable).mockImplementation(() => {
        throw new Error('Edge error');
      });

      const finder = new BrowserFinder(mockLogger);
      expect(() => finder.findBrowser('edge')).toThrow('Edge error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Find Edge Error:',
        expect.any(Error),
      );
    });

    it('should throw and log error when Firefox lookup fails', () => {
      vi.mocked(getAnyFirefoxStable).mockImplementation(() => {
        throw new Error('Firefox error');
      });

      const finder = new BrowserFinder(mockLogger);
      expect(() => finder.findBrowser('firefox')).toThrow('Firefox error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Find Firefox Error:',
        expect.any(Error),
      );
    });
  });
});
