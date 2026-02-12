/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import {
  type WindowWaitReadyToolCallV1,
  buildWindowWaitReadyToolCall,
  runWindowWaitReadyToolCall,
} from './windowWaitReadyTool';

describe('windowWaitReadyTool', () => {
  it('builds deterministic window.wait_ready call for supported target', () => {
    const call = buildWindowWaitReadyToolCall({
      intentId: 'intent-1',
      targetWindow: 'notepad',
      platform: 'win32',
    });

    expect(call.toolName).toBe('window.wait_ready');
    expect(call.canonicalArgs.targetWindow).toBe('notepad');
    expect(call.canonicalArgs.checkArgv[0]).toBe('powershell');
    expect(call.canonicalArgs.pollIntervalMs).toBe(500);
    expect(call.idempotencyKey).toContain('window.wait_ready:intent-1:notepad');
  });

  it('accepts call envelope without idempotency key (registry-compatible)', async () => {
    const baseCall = buildWindowWaitReadyToolCall({
      intentId: 'intent-1a',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-1a',
    });

    const callWithoutKey: WindowWaitReadyToolCallV1 = {
      ...baseCall,
      idempotencyKey: undefined,
    };

    const runSystemRun = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'sys-call-1a',
      toolName: 'system.run',
      toolVersion: '1.0.0',
      status: 'ok',
      errorClass: 'none',
      exitCode: 0,
      stdout: 'ready',
      stderr: '',
      durationMs: 5,
      deltaObserved: true,
      artifacts: {
        stdoutBytes: 5,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });

    const result = await runWindowWaitReadyToolCall(callWithoutKey, {
      runSystemRun,
      sleepMs: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('ok');
    const firstCall = runSystemRun.mock.calls[0]?.[0];
    expect(firstCall?.idempotencyKey).toContain('window.wait_ready:intent-1a');
  });

  it('returns ok when check command succeeds on first attempt', async () => {
    const call = buildWindowWaitReadyToolCall({
      intentId: 'intent-2',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-2',
    });

    const runSystemRun = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'sys-call-1',
      toolName: 'system.run',
      toolVersion: '1.0.0',
      status: 'ok',
      errorClass: 'none',
      exitCode: 0,
      stdout: 'ready',
      stderr: '',
      durationMs: 20,
      deltaObserved: true,
      artifacts: {
        stdoutBytes: 5,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });

    const result = await runWindowWaitReadyToolCall(call, {
      runSystemRun,
      sleepMs: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('ok');
    expect(result.errorClass).toBe('none');
    expect(result.ready).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.systemRunCallId).toBe('sys-call-1');
  });

  it('retries until timeout and returns window_not_ready', async () => {
    const call = buildWindowWaitReadyToolCall({
      intentId: 'intent-3',
      targetWindow: 'notepad',
      platform: 'win32',
      timeoutMs: 300,
      pollIntervalMs: 100,
      idempotencyKey: 'idem-3',
    });

    const runSystemRun = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'sys-call-retry',
      toolName: 'system.run',
      toolVersion: '1.0.0',
      status: 'error',
      errorClass: 'non_zero_exit',
      exitCode: 3,
      stdout: '',
      stderr: 'not ready',
      durationMs: 10,
      deltaObserved: false,
      artifacts: {
        stdoutBytes: 0,
        stderrBytes: 9,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });

    const result = await runWindowWaitReadyToolCall(call, {
      runSystemRun,
      sleepMs: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('timeout');
    expect(result.errorClass).toBe('window_not_ready');
    expect(result.ready).toBe(false);
    expect(result.attempts).toBeGreaterThanOrEqual(1);
  });

  it('returns validation_error for malformed call', async () => {
    const result = await runWindowWaitReadyToolCall(
      {} as WindowWaitReadyToolCallV1,
    );

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('validation_error');
    expect(result.ready).toBe(false);
  });

  it('caps per-attempt system.run timeout when pollInterval exceeds 60s', async () => {
    const call = buildWindowWaitReadyToolCall({
      intentId: 'intent-4',
      targetWindow: 'notepad',
      platform: 'win32',
      timeoutMs: 60000,
      pollIntervalMs: 120000,
      idempotencyKey: 'idem-4',
    });

    const runSystemRun = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'sys-call-cap',
      toolName: 'system.run',
      toolVersion: '1.0.0',
      status: 'ok',
      errorClass: 'none',
      exitCode: 0,
      stdout: 'ready',
      stderr: '',
      durationMs: 10,
      deltaObserved: true,
      artifacts: {
        stdoutBytes: 5,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });

    const result = await runWindowWaitReadyToolCall(call, {
      runSystemRun,
      sleepMs: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('ok');
    expect(runSystemRun).toHaveBeenCalledTimes(1);
    const firstCall = runSystemRun.mock.calls[0]?.[0];
    expect(firstCall?.canonicalArgs.timeoutMs).toBeLessThanOrEqual(60000);
  });

  it('returns spawn_error immediately instead of masking as not-ready timeout', async () => {
    const call = buildWindowWaitReadyToolCall({
      intentId: 'intent-5',
      targetWindow: 'notepad',
      platform: 'win32',
      timeoutMs: 10000,
      pollIntervalMs: 500,
      idempotencyKey: 'idem-5',
    });

    const runSystemRun = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'sys-call-spawn-error',
      toolName: 'system.run',
      toolVersion: '1.0.0',
      status: 'error',
      errorClass: 'spawn_error',
      exitCode: null,
      stdout: '',
      stderr: 'spawn failed',
      durationMs: 5,
      deltaObserved: false,
      artifacts: {
        stdoutBytes: 0,
        stderrBytes: 12,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });
    const sleepMs = vi.fn().mockResolvedValue(undefined);

    const result = await runWindowWaitReadyToolCall(call, {
      runSystemRun,
      sleepMs,
    });

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('spawn_error');
    expect(result.ready).toBe(false);
    expect(result.attempts).toBe(1);
    expect(sleepMs).not.toHaveBeenCalled();
  });
});
