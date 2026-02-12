/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import {
  type SystemRunToolCallV1,
  buildSystemRunToolCall,
  runSystemRunToolCall,
} from './systemRunTool';

describe('systemRunTool', () => {
  it('builds deterministic call envelope with canonical argv', () => {
    const call = buildSystemRunToolCall({
      intentId: 'intent-1',
      argv: ['  cmd  ', ' /c ', ' echo ', ' hello '],
      idempotencyKey: 'idem-1',
    });

    expect(call.toolName).toBe('system.run');
    expect(call.canonicalArgs.argv).toEqual(['cmd', '/c', 'echo', 'hello']);
  });

  it('rejects empty argv after canonicalization', () => {
    expect(() =>
      buildSystemRunToolCall({
        intentId: 'intent-2',
        argv: ['   '],
        idempotencyKey: 'idem-2',
      }),
    ).toThrow('[SYSTEM_RUN_INVALID_ARGS]');
  });

  it('returns ok result for successful command', async () => {
    const call = buildSystemRunToolCall({
      intentId: 'intent-3',
      argv: [process.execPath, '-e', 'process.stdout.write("ok")'],
      idempotencyKey: 'idem-3',
      timeoutMs: 2000,
    });

    const result = await runSystemRunToolCall(call);

    expect(result.status).toBe('ok');
    expect(result.errorClass).toBe('none');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('returns non_zero_exit for failing command', async () => {
    const call = buildSystemRunToolCall({
      intentId: 'intent-4',
      argv: [process.execPath, '-e', 'process.exit(7)'],
      idempotencyKey: 'idem-4',
      timeoutMs: 2000,
    });

    const result = await runSystemRunToolCall(call);

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('non_zero_exit');
    expect(result.exitCode).toBe(7);
  });

  it('returns timeout status when command exceeds timeout', async () => {
    const call = buildSystemRunToolCall({
      intentId: 'intent-5',
      argv: [process.execPath, '-e', 'setTimeout(() => {}, 1000)'],
      idempotencyKey: 'idem-5',
      timeoutMs: 50,
    });

    const result = await runSystemRunToolCall(call);

    expect(result.status).toBe('timeout');
    expect(result.errorClass).toBe('timeout');
    expect(result.exitCode).toBeNull();
  });

  it('uses hard-kill fallback and resolves when close never arrives', async () => {
    vi.useFakeTimers();
    try {
      const fakeChild = new EventEmitter() as EventEmitter & {
        pid: number;
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      fakeChild.pid = 321;
      fakeChild.stdout = new EventEmitter();
      fakeChild.stderr = new EventEmitter();
      fakeChild.kill = vi.fn().mockReturnValue(true);
      const processTreeKiller = vi.fn();

      const call = buildSystemRunToolCall({
        intentId: 'intent-6',
        argv: ['fake-command'],
        idempotencyKey: 'idem-6',
        timeoutMs: 50,
      });

      const resultPromise = runSystemRunToolCall(call, {
        spawnImpl: () => fakeChild as never,
        hardKillGraceMs: 10,
        forceResolveGraceMs: 20,
        processTreeKiller,
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(processTreeKiller).toHaveBeenNthCalledWith(
        1,
        fakeChild,
        'SIGTERM',
      );
      expect(processTreeKiller).toHaveBeenNthCalledWith(
        2,
        fakeChild,
        'SIGKILL',
      );
      expect(result.status).toBe('timeout');
      expect(result.errorClass).toBe('timeout');
      expect(result.stderr).toContain('[SYSTEM_RUN_TIMEOUT]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns structured spawn_error when spawn throws synchronously', async () => {
    const call = buildSystemRunToolCall({
      intentId: 'intent-7',
      argv: ['invalid-command'],
      idempotencyKey: 'idem-7',
      timeoutMs: 100,
    });

    const result = await runSystemRunToolCall(call, {
      spawnImpl: () => {
        throw new Error('sync spawn failure');
      },
    });

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('spawn_error');
    expect(result.stderr).toContain('sync spawn failure');
  });

  it('uses canonical timeout value instead of top-level timeout field', async () => {
    vi.useFakeTimers();
    try {
      const fakeChild = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      fakeChild.stdout = new EventEmitter();
      fakeChild.stderr = new EventEmitter();
      fakeChild.kill = vi.fn().mockReturnValue(true);

      const builtCall = buildSystemRunToolCall({
        intentId: 'intent-8',
        argv: ['fake-command'],
        idempotencyKey: 'idem-8',
        timeoutMs: 25,
      });
      const mutatedCall = {
        ...builtCall,
        timeoutMs: 5000,
      };

      const resultPromise = runSystemRunToolCall(mutatedCall, {
        spawnImpl: () => fakeChild as never,
        hardKillGraceMs: 10,
        forceResolveGraceMs: 20,
      });

      await vi.advanceTimersByTimeAsync(24);
      expect(fakeChild.kill).toHaveBeenCalledTimes(0);

      await vi.advanceTimersByTimeAsync(1);
      expect(fakeChild.kill).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;
      expect(result.status).toBe('timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns structured validation_error instead of throwing', async () => {
    const result = await runSystemRunToolCall({} as SystemRunToolCallV1);

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('validation_error');
    expect(result.callId.length).toBeGreaterThan(0);
    expect(result.toolName).toBe('system.run');
  });
});
