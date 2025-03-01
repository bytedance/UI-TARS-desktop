import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, desktopCapturer } from 'electron';
import { NutJSElectronOperator } from './operator';

// Mock dependencies
vi.mock('electron', () => ({
  screen: {
    getPrimaryDisplay: vi.fn(),
  },
  desktopCapturer: {
    getSources: vi.fn(),
  },
  app: {
    on: vi.fn(),
    off: vi.fn(),
    quit: vi.fn(),
    exit: vi.fn(),
    relaunch: vi.fn(),
  },
}));

vi.mock('@main/env', () => ({
  isMacOS: false,
}));

describe('NutJSElectronOperator', () => {
  let operator: NutJSElectronOperator;
  const mockDisplay = {
    id: '1',
    size: { width: 1920, height: 1080 },
    scaleFactor: 1,
  };

  beforeEach(() => {
    operator = new NutJSElectronOperator();
    // Set the default display mock for each test
    vi.mocked(screen.getPrimaryDisplay).mockReturnValue(mockDisplay as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('screenshot', () => {
    it('should capture screenshot successfully', async () => {
      const mockSource = {
        display_id: '1',
        thumbnail: {
          toPNG: () => Buffer.from('mock-image'),
          resize: () => ({
            toPNG: () => Buffer.from('mock-image'),
          }),
        },
      };

      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([
        mockSource as any,
      ]);

      const result = await operator.screenshot();

      expect(result).toEqual({
        base64: 'bW9jay1pbWFnZQ==',
        width: 1920,
        height: 1080,
        scaleFactor: 1,
      });
      expect(desktopCapturer.getSources).toHaveBeenCalledWith({
        types: ['screen'],
        thumbnailSize: {
          width: 1920,
          height: 1080,
        },
      });
    });

    it('should handle screenshot failure gracefully', async () => {
      // Please set the display mock first, then set the getSources failure
      vi.mocked(desktopCapturer.getSources).mockRejectedValueOnce(
        new Error('Screenshot failed'),
      );

      await expect(operator.screenshot()).rejects.toThrow('Screenshot failed');
    });

    it('should handle empty sources array', async () => {
      // Use an empty array to simulate the case where no screen source is found
      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([]);

      await expect(operator.screenshot()).rejects.toThrow(
        "Cannot read properties of undefined (reading 'thumbnail')",
      );
    });

    it('should handle different scale factors', async () => {
      const scaleFactorDisplay = {
        ...mockDisplay,
        scaleFactor: 2,
        size: { width: 1920, height: 1080 }, // Logical size
      };

      vi.mocked(screen.getPrimaryDisplay).mockReturnValue(
        scaleFactorDisplay as any,
      );
      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([
        {
          display_id: '1',
          thumbnail: {
            toPNG: () => Buffer.from('mock-image'),
            resize: () => ({
              toPNG: () => Buffer.from('mock-image'),
            }),
          },
        } as any,
      ]);

      const result = await operator.screenshot();
      expect(result.scaleFactor).toBe(2);
      // The actual physical size is the logical size * scaleFactor
      expect(result.width).toBe(3840); // 1920 * 2
      expect(result.height).toBe(2160); // 1080 * 2
    });
  });
});
