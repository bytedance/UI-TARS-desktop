import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clipboard, desktopCapturer } from 'electron';
import { Key, keyboard } from '@computer-use/nut-js';
import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { NutJSElectronOperator } from './operator';

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn(),
    writeText: vi.fn(),
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

vi.mock('@computer-use/nut-js', () => ({
  Key: {
    LeftControl: 'LeftControl',
    V: 'V',
    Enter: 'Enter',
  },
  keyboard: {
    config: {
      autoDelayMs: 500,
    },
    pressKey: vi.fn(),
    releaseKey: vi.fn(),
  },
}));

vi.mock('@main/env', () => ({
  isMacOS: false,
  isWindows: true,
}));

vi.mock('@main/utils/screen', () => ({
  getScreenSize: vi.fn(() => ({
    physicalSize: { width: 1920, height: 1080 },
    logicalSize: { width: 1920, height: 1080 },
    scaleFactor: 1,
    id: 1,
  })),
}));

describe('NutJSElectronOperator', () => {
  let operator: NutJSElectronOperator;
  const superExecuteSpy = vi.spyOn(NutJSOperator.prototype, 'execute');

  beforeEach(() => {
    operator = new NutJSElectronOperator();
    superExecuteSpy.mockResolvedValue(undefined as never);
    superExecuteSpy.mockClear();
    vi.mocked(clipboard.readText).mockReturnValue('original-text');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('screenshot', () => {
    it('captures screenshot from primary display source', async () => {
      const mockSource = {
        display_id: '1',
        thumbnail: {
          resize: () => ({
            toJPEG: () => Buffer.from('mock-image'),
          }),
        },
      };

      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([
        mockSource as never,
      ]);

      const result = await operator.screenshot();

      expect(result).toEqual({
        base64: 'bW9jay1pbWFnZQ==',
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
  });

  describe('execute type handling on Windows', () => {
    it.each([
      { content: 'hello', shouldSubmit: false, expectedPaste: 'hello' },
      { content: 'hello\\n', shouldSubmit: true, expectedPaste: 'hello' },
      { content: 'hello\n', shouldSubmit: true, expectedPaste: 'hello' },
      { content: ' hello ', shouldSubmit: false, expectedPaste: 'hello' },
      { content: 'foo bar', shouldSubmit: false, expectedPaste: 'foo bar' },
      { content: 'foo bar\\n', shouldSubmit: true, expectedPaste: 'foo bar' },
      { content: 'foo bar\n', shouldSubmit: true, expectedPaste: 'foo bar' },
      { content: 'x', shouldSubmit: false, expectedPaste: 'x' },
      { content: 'x\\n', shouldSubmit: true, expectedPaste: 'x' },
      { content: 'x\n', shouldSubmit: true, expectedPaste: 'x' },
    ])(
      'handles content="$content" deterministically',
      async ({ content, shouldSubmit, expectedPaste }) => {
        await operator.execute({
          parsedPrediction: {
            action_type: 'type',
            action_inputs: { content },
          },
        } as never);

        expect(clipboard.writeText).toHaveBeenNthCalledWith(1, expectedPaste);
        expect(clipboard.writeText).toHaveBeenNthCalledWith(2, 'original-text');
        expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftControl, Key.V);
        expect(keyboard.releaseKey).toHaveBeenCalledWith(
          Key.LeftControl,
          Key.V,
        );

        if (shouldSubmit) {
          expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Enter);
          expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.Enter);
        } else {
          expect(keyboard.pressKey).not.toHaveBeenCalledWith(Key.Enter);
          expect(keyboard.releaseKey).not.toHaveBeenCalledWith(Key.Enter);
        }

        expect(superExecuteSpy).not.toHaveBeenCalled();
      },
    );

    it('falls back to super execute when content becomes empty after trim', async () => {
      await operator.execute({
        parsedPrediction: {
          action_type: 'type',
          action_inputs: { content: '   ' },
        },
      } as never);

      expect(superExecuteSpy).toHaveBeenCalledTimes(1);
      expect(keyboard.pressKey).not.toHaveBeenCalled();
      expect(keyboard.releaseKey).not.toHaveBeenCalled();
    });

    it('falls back to super execute for non-type actions', async () => {
      await operator.execute({
        parsedPrediction: {
          action_type: 'click',
          action_inputs: {},
        },
      } as never);

      expect(superExecuteSpy).toHaveBeenCalledTimes(1);
    });

    it('restores keyboard delay when Windows paste throws', async () => {
      keyboard.config.autoDelayMs = 321;
      vi.mocked(clipboard.writeText).mockImplementationOnce(() => {
        throw new Error('paste failed');
      });

      await expect(
        operator.execute({
          parsedPrediction: {
            action_type: 'type',
            action_inputs: { content: 'hello' },
          },
        } as never),
      ).rejects.toThrow('paste failed');

      expect(keyboard.config.autoDelayMs).toBe(321);
    });
  });
});
