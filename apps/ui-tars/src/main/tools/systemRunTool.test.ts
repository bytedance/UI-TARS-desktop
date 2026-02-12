/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import { buildSystemRunToolCall, runSystemRunToolCall } from './systemRunTool';

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
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      fakeChild.stdout = new EventEmitter();
      fakeChild.stderr = new EventEmitter();
      fakeChild.kill = vi.fn().mockReturnValue(true);

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
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(fakeChild.kill).toHaveBeenNthCalledWith(1);
      expect(fakeChild.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
      expect(result.status).toBe('timeout');
      expect(result.errorClass).toBe('timeout');
      expect(result.stderr).toContain('[SYSTEM_RUN_TIMEOUT]');
    } finally {
      vi.useRealTimers();
    }
  });
});
