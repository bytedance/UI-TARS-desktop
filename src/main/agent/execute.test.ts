import { Key, keyboard } from '@computer-use/nut-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecuteParams, execute } from './execute';

// Mock @computer-use/nut-js
vi.mock('@computer-use/nut-js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    mouse: {
      move: vi.fn(),
      click: vi.fn(),
      config: {
        mouseSpeed: 1500,
      },
    },
    Key: actual.Key,
    keyboard: {
      type: vi.fn(),
      pressKey: vi.fn(),
      releaseKey: vi.fn(),
      config: {
        autoDelayMs: 0,
      },
    },
    Button: {
      LEFT: 'left',
      RIGHT: 'right',
      MIDDLE: 'middle',
    },
    Point: vi.fn(),
    straightTo: vi.fn((point) => point),
    sleep: vi.fn(),
  };
});

describe('execute', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('type doubao.com\n', async () => {
    const executeParams: ExecuteParams = {
      prediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "doubao.com" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'doubao.com\\n' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      logger: mockLogger,
      scaleFactor: 1,
    };

    await execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('doubao.com');
    expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Enter);
  });

  it('type doubao.com', async () => {
    const executeParams: ExecuteParams = {
      prediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "doubao.com" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'doubao.com' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      logger: mockLogger,
      scaleFactor: 1,
    };

    await execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('doubao.com');
    expect(keyboard.pressKey).not.toHaveBeenCalledWith(Key.Enter);
  });

  it('type Hello World\nUI-TARS\n', async () => {
    const executeParams: ExecuteParams = {
      prediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "Hello World\nUI-TARS\n" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'Hello World\\nUI-TARS\\n' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      logger: mockLogger,
      scaleFactor: 1,
    };

    await execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('Hello World\\nUI-TARS');
    expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Enter);
  });
});
