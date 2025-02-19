import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, desktopCapturer } from 'electron';
import { Desktop } from './device';

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

vi.mock('./execute', () => ({
  execute: vi.fn(),
}));

vi.mock('@main/env', () => ({
  isMacOS: false,
}));

describe('Desktop', () => {
  let desktop: Desktop;

  beforeEach(() => {
    desktop = new Desktop();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('screenshot', () => {
    it('should capture screenshot successfully', async () => {
      const mockDisplay = {
        id: '1',
        size: { width: 1920, height: 1080 },
      };
      const mockSource = {
        display_id: '1',
        thumbnail: {
          toPNG: () => Buffer.from('mock-image'),
        },
      };

      vi.mocked(screen.getPrimaryDisplay).mockReturnValue(mockDisplay as any);
      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([
        mockSource as any,
      ]);

      const result = await desktop.screenshot();

      expect(result).toEqual({
        base64: 'bW9jay1pbWFnZQ==',
        width: 1920,
        height: 1080,
      });
      expect(desktopCapturer.getSources).toHaveBeenCalledWith({
        types: ['screen'],
        thumbnailSize: {
          width: 1920,
          height: 1080,
        },
      });
    });
  });
});
