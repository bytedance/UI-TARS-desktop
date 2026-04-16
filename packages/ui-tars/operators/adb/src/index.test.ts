/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCommand = vi.fn();
const mockPrompt = vi.fn();

vi.mock('execa', () => ({
  command: mockCommand,
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
  },
}));

vi.mock('@ui-tars/sdk/core', () => ({
  Operator: class {},
  useContext: () => ({ logger: { error: vi.fn() } }),
  parseBoxToScreenCoords: vi.fn().mockImplementation(({ boxStr, screenWidth, screenHeight }) => {
    if (!boxStr) {
      return { x: null, y: null };
    }
    const match = /\[([0-9.]+),([0-9.]+),/.exec(boxStr);
    if (!match) {
      return { x: null, y: null };
    }
    return {
      x: Number(match[1]) * screenWidth,
      y: Number(match[2]) * screenHeight,
    };
  }),
  StatusEnum: {
    OK: 'ok',
    ERROR: 'error',
  },
}));

describe('getAndroidDeviceId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses adb device output with variable whitespace', async () => {
    mockCommand.mockResolvedValueOnce({
      stdout: 'List of devices attached\nBQZLCEKNNV9HTWZT       device usb:2-2.1 product:PEQM00 model:PEQM00\n',
    });

    const { getAndroidDeviceId } = await import('./index');
    await expect(getAndroidDeviceId()).resolves.toBe('BQZLCEKNNV9HTWZT');
  });
});

describe('AdbOperator scroll fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommand.mockResolvedValue({ stdout: '' });
  });

  it('falls back to screen center when scroll start_box is missing', async () => {
    const { AdbOperator } = await import('./index');
    const operator = new AdbOperator('device-1');

    await operator.execute({
      parsedPrediction: {
        action_type: 'scroll',
        action_inputs: {
          direction: 'down',
        },
      },
      screenWidth: 1000,
      screenHeight: 2000,
    } as any);

    expect(mockCommand).toHaveBeenCalledWith(
      'adb -s device-1 shell input swipe 500 1000 500 1100 300',
      { timeout: 3000 },
    );
  });
});
