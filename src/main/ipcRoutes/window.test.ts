import { windowRoute } from './window';
import { showWindow } from '@main/window';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock window module
vi.mock('@main/window', () => ({
  showWindow: vi.fn(),
}));

describe('windowRoute.showMainWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call showWindow function', async () => {
    await windowRoute.showMainWindow.handle({
      input: undefined,
      context: {} as any,
    });

    expect(showWindow).toHaveBeenCalled();
    expect(showWindow).toHaveBeenCalledTimes(1);
  });

  it('should handle showWindow being called multiple times', async () => {
    await windowRoute.showMainWindow.handle({
      input: undefined,
      context: {} as any,
    });
    await windowRoute.showMainWindow.handle({
      input: undefined,
      context: {} as any,
    });
    await windowRoute.showMainWindow.handle({
      input: undefined,
      context: {} as any,
    });

    expect(showWindow).toHaveBeenCalledTimes(3);
  });

  it('should handle errors from showWindow', async () => {
    (showWindow as any).mockImplementationOnce(() => {
      throw new Error('Failed to show window');
    });

    await expect(
      windowRoute.showMainWindow.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to show window');
  });
});
