import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, desktopCapturer } from 'electron';
import { NutJSElectronOperator, AdbElectronOperator } from './operator';

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

// Mock AdbOperator
vi.mock('@ui-tars/operator-adb', () => ({
  AdbOperator: vi.fn().mockImplementation(() => ({
    screenshot: vi.fn(),
    execute: vi.fn(),
  })),
  getAndroidDeviceId: vi.fn(),
}));

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('NutJSElectronOperator', () => {
  let operator: NutJSElectronOperator;

  beforeEach(() => {
    operator = new NutJSElectronOperator();
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
        scaleFactor: 1,
      };
      const mockSource = {
        display_id: '1',
        thumbnail: {
          toPNG: () => Buffer.from('mock-image'),
          resize: () => ({
            toPNG: () => Buffer.from('mock-image'),
          }),
        },
      };

      vi.mocked(screen.getPrimaryDisplay).mockReturnValue(mockDisplay as any);
      vi.mocked(desktopCapturer.getSources).mockResolvedValueOnce([
        mockSource as any,
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
});

type Factors = [number, number];
const DEFAULT_FACTORS: Factors = [1000, 1000];

describe('AdbElectronOperator', () => {
  let operator: AdbElectronOperator;
  const mockDeviceId = 'device123';

  beforeEach(() => {
    operator = new AdbElectronOperator(mockDeviceId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('应该使用设备ID正确初始化', () => {
      expect(operator).toBeInstanceOf(AdbElectronOperator);
    });
  });

  describe('screenshot', () => {
    it('应该成功捕获屏幕截图', async () => {
      const mockScreenshotResult = {
        base64: 'mock-android-screenshot-base64',
        width: 1080,
        height: 2340,
        scaleFactor: 1,
      };

      // 模拟父类的screenshot方法
      const superScreenshot = vi.spyOn(
        Object.getPrototypeOf(AdbElectronOperator.prototype),
        'screenshot',
      );
      superScreenshot.mockResolvedValueOnce(mockScreenshotResult);

      const result = await operator.screenshot();

      expect(result).toEqual(mockScreenshotResult);
      expect(superScreenshot).toHaveBeenCalledTimes(1);
    });

    it('应该处理截图失败的情况', async () => {
      const mockError = new Error('截图失败');

      // 模拟父类的screenshot方法抛出错误
      const superScreenshot = vi.spyOn(
        Object.getPrototypeOf(AdbElectronOperator.prototype),
        'screenshot',
      );
      superScreenshot.mockRejectedValueOnce(mockError);

      await expect(operator.screenshot()).rejects.toThrow('截图失败');
      expect(superScreenshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute', () => {
    it('应该成功执行操作', async () => {
      const mockParams = {
        parsedPrediction: {
          action_type: 'click',
          action_inputs: {
            start_box: '[100, 200, 120, 220]',
          },
          thought: '点击按钮',
          reflection: null,
        },
        prediction:
          "Thought: 点击按钮\nAction: click(start_box='[100, 200, 120, 220]')",
        screenWidth: 1080,
        screenHeight: 2340,
        scaleFactor: 1,
        factors: DEFAULT_FACTORS,
      };

      const mockExecuteResult = {
        success: true,
      };

      // 模拟父类的execute方法
      const superExecute = vi.spyOn(
        Object.getPrototypeOf(AdbElectronOperator.prototype),
        'execute',
      );
      superExecute.mockResolvedValueOnce(mockExecuteResult);

      const result = await operator.execute(mockParams);

      expect(result).toEqual(mockExecuteResult);
      expect(superExecute).toHaveBeenCalledWith(mockParams);
    });

    it('应该处理执行失败的情况', async () => {
      const mockParams = {
        parsedPrediction: {
          action_type: 'click',
          action_inputs: {
            start_box: '[100, 200, 120, 220]',
          },
          thought: '点击按钮',
          reflection: null,
        },
        prediction:
          "Thought: 点击按钮\nAction: click(start_box='[100, 200, 120, 220]')",
        screenWidth: 1080,
        screenHeight: 2340,
        scaleFactor: 1,
        factors: DEFAULT_FACTORS,
      };

      const mockError = new Error('执行失败');

      // 模拟父类的execute方法抛出错误
      const superExecute = vi.spyOn(
        Object.getPrototypeOf(AdbElectronOperator.prototype),
        'execute',
      );
      superExecute.mockRejectedValueOnce(mockError);

      await expect(operator.execute(mockParams)).rejects.toThrow('执行失败');
      expect(superExecute).toHaveBeenCalledWith(mockParams);
    });
  });
});
