/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const shell = vi.fn<(cmd: string) => Promise<void>>();
const inputText = vi.fn<(text: string) => Promise<void>>();
const keyevent = vi.fn<(code: number) => Promise<void>>();

vi.mock('node:child_process', () => ({
  exec: (_cmd: string, cb: (e: unknown, r: { stdout: string }) => void) =>
    cb(null, { stdout: 'List of devices attached\nemulator-5554\tdevice\n' }),
}));

vi.mock('appium-adb', () => ({
  ADB: {
    createADB: async () => ({
      shell,
      inputText,
      keyevent,
      getScreenSize: async () => '1080x1920',
      getScreenDensity: async () => 320,
    }),
  },
}));

const { AdbOperator } = await import('../src/AdbOperator');

/** A promise the test resolves/rejects by hand, to observe whether execute() waits for it. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Resolves on the next macrotask, so a non-awaited branch has every chance to settle first. */
const tick = () => new Promise((r) => setTimeout(r, 0));

/** 'settled' only if doExecute() finished before the pending ADB command did. */
async function raceExecution(execution: Promise<unknown>) {
  return Promise.race([
    execution.then(() => 'settled' as const),
    tick().then(() => 'pending' as const),
  ]);
}

const point = { raw: { x: 100, y: 200 } };

describe('AdbOperator awaits its ADB commands', () => {
  beforeEach(() => {
    shell.mockReset();
    inputText.mockReset();
    keyevent.mockReset();
  });

  it.each([
    ['long_press', { type: 'long_press', inputs: { point } }],
    ['swipe', { type: 'swipe', inputs: { start: point, end: { raw: { x: 300, y: 400 } } } }],
    ['drag', { type: 'drag', inputs: { start: point, end: { raw: { x: 300, y: 400 } } } }],
    ['scroll', { type: 'scroll', inputs: { direction: 'down', point } }],
  ])('%s stays pending until the ADB shell command settles', async (_name, action) => {
    const pending = deferred();
    shell.mockReturnValue(pending.promise);

    const execution = new AdbOperator().doExecute({ actions: [action] } as never);

    await expect(raceExecution(execution)).resolves.toBe('pending');

    pending.resolve();
    await expect(execution).resolves.toMatchObject({ status: 'success' });
  });

  it('type stays pending until inputText settles', async () => {
    const pending = deferred();
    inputText.mockReturnValue(pending.promise);

    const execution = new AdbOperator().doExecute({
      actions: [{ type: 'type', inputs: { content: 'hello' } }],
    } as never);

    await expect(raceExecution(execution)).resolves.toBe('pending');

    pending.resolve();
    await expect(execution).resolves.toMatchObject({ status: 'success' });
  });

  it('hotkey stays pending until keyevent settles', async () => {
    const pending = deferred();
    keyevent.mockReturnValue(pending.promise);

    const execution = new AdbOperator().doExecute({
      actions: [{ type: 'hotkey', inputs: { key: 'home' } }],
    } as never);

    await expect(raceExecution(execution)).resolves.toBe('pending');

    pending.resolve();
    await expect(execution).resolves.toMatchObject({ status: 'success' });
  });
});

describe('AdbOperator surfaces ADB failures instead of detaching them', () => {
  beforeEach(() => {
    shell.mockReset();
    inputText.mockReset();
    keyevent.mockReset();
  });

  it('reports a rejected swipe as failed rather than success', async () => {
    shell.mockRejectedValue(new Error('adb failed'));

    await expect(
      new AdbOperator().doExecute({
        actions: [{ type: 'swipe', inputs: { start: point, end: { raw: { x: 300, y: 400 } } } }],
      } as never),
    ).resolves.toMatchObject({ status: 'failed', errorMessage: 'adb failed' });
  });

  it('reports a rejected keyevent as failed rather than success', async () => {
    keyevent.mockRejectedValue(new Error('keyevent failed'));

    await expect(
      new AdbOperator().doExecute({
        actions: [{ type: 'hotkey', inputs: { key: 'home' } }],
      } as never),
    ).resolves.toMatchObject({ status: 'failed', errorMessage: 'keyevent failed' });
  });

  it('does not start the next action before the previous one finishes', async () => {
    const order: string[] = [];
    shell.mockImplementation(async (cmd: string) => {
      const label = cmd.startsWith('input swipe') ? 'swipe' : cmd;
      order.push(`start:${label}`);
      await tick();
      order.push(`end:${label}`);
    });
    inputText.mockImplementation(async () => {
      order.push('start:type');
      await tick();
      order.push('end:type');
    });

    await new AdbOperator().doExecute({
      actions: [
        { type: 'swipe', inputs: { start: point, end: { raw: { x: 300, y: 400 } } } },
        { type: 'type', inputs: { content: 'hello' } },
      ],
    } as never);

    expect(order).toEqual(['start:swipe', 'end:swipe', 'start:type', 'end:type']);
  });
});
