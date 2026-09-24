/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ConsoleLogger } from '@agent-infra/logger';
import type { BaseAction } from '@gui-agent/shared/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdbOperator } from '../src/AdbOperator';

type AdbMethod = 'shell' | 'inputText' | 'keyevent';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

function createDeferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createLogger(): ConsoleLogger {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    ...logger,
    spawn: vi.fn(() => logger),
  } as unknown as ConsoleLogger;
}

function createOperator(deferred: Deferred, method: AdbMethod) {
  const operator = new AdbOperator(createLogger());
  const adb = {
    shell: vi.fn().mockResolvedValue(undefined),
    inputText: vi.fn().mockResolvedValue(undefined),
    keyevent: vi.fn().mockResolvedValue(undefined),
  };
  adb[method].mockReturnValueOnce(deferred.promise);

  Reflect.set(operator, '_adb', adb);
  vi.spyOn(operator, 'doInitialize').mockResolvedValue(undefined);
  vi.spyOn(operator, 'getScreenContext').mockResolvedValue({
    screenWidth: 1080,
    screenHeight: 1920,
    scaleX: 1,
    scaleY: 1,
  });

  return { operator, adb };
}

const point = (x: number, y: number) => ({ raw: { x, y } });

const cases: Array<{
  name: string;
  action: BaseAction;
  method: AdbMethod;
}> = [
  {
    name: 'long_press',
    action: { type: 'long_press', inputs: { point: point(100, 200) } },
    method: 'shell',
  },
  {
    name: 'swipe',
    action: {
      type: 'swipe',
      inputs: { start: point(100, 200), end: point(300, 400), direction: 'down' },
    },
    method: 'shell',
  },
  {
    name: 'drag',
    action: {
      type: 'drag',
      inputs: { start: point(100, 200), end: point(300, 400) },
    },
    method: 'shell',
  },
  {
    name: 'scroll',
    action: { type: 'scroll', inputs: { direction: 'down' } },
    method: 'shell',
  },
  {
    name: 'type',
    action: { type: 'type', inputs: { content: 'hello' } },
    method: 'inputText',
  },
  {
    name: 'hotkey',
    action: { type: 'hotkey', inputs: { key: 'home' } },
    method: 'keyevent',
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(cases)('$name action', ({ action, method }) => {
  it('waits for the ADB command and reports its failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const deferred = createDeferred();
    const { operator, adb } = createOperator(deferred, method);
    const execution = operator.doExecute({ actions: [action] });

    await vi.waitFor(() => {
      expect(adb[method]).toHaveBeenCalledOnce();
    });

    try {
      const state = await Promise.race([
        execution.then(() => 'settled'),
        new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 0)),
      ]);
      expect(state).toBe('pending');

      deferred.reject(new Error('adb failed'));
      await expect(execution).resolves.toEqual({
        status: 'failed',
        errorMessage: 'adb failed',
      });
    } finally {
      deferred.resolve();
    }
  });
});

describe('multi-action ordering', () => {
  it('does not start the next action until the current ADB command finishes', async () => {
    const deferred = createDeferred();
    const { operator, adb } = createOperator(deferred, 'inputText');
    const execution = operator.doExecute({
      actions: [
        { type: 'type', inputs: { content: 'hello' } },
        { type: 'hotkey', inputs: { key: 'home' } },
      ],
    });

    await vi.waitFor(() => {
      expect(adb.inputText).toHaveBeenCalledOnce();
    });
    expect(adb.keyevent).not.toHaveBeenCalled();

    deferred.resolve();

    await expect(execution).resolves.toEqual({ status: 'success' });
    expect(adb.keyevent).toHaveBeenCalledOnce();
  });
});
