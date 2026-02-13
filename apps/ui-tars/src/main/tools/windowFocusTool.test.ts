/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import {
  type WindowFocusToolCallV1,
  buildWindowFocusToolCall,
  runWindowFocusToolCall,
} from './windowFocusTool';

const withMockedPlatform = async <T>(
  platform: NodeJS.Platform,
  run: () => Promise<T> | T,
): Promise<T> => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });
  try {
    return await run();
  } finally {
    if (descriptor) {
      Object.defineProperty(process, 'platform', descriptor);
    }
  }
};

describe('windowFocusTool', () => {
  it('builds deterministic window.focus call for supported target', () => {
    const call = buildWindowFocusToolCall({
      intentId: 'intent-1',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-1',
    });

    expect(call.toolName).toBe('window.focus');
    expect(call.canonicalArgs.targetWindow).toBe('notepad');
    expect(call.canonicalArgs.argv[0]).toBe('powershell');
    expect(call.canonicalArgs.argv.join(' ')).toContain('AppActivate');
  });

  it('uses non-launching darwin focus command for existing app windows', () => {
    const call = buildWindowFocusToolCall({
      intentId: 'intent-1b',
      targetWindow: 'cursor',
      platform: 'darwin',
      idempotencyKey: 'idem-1b',
    });

    expect(call.canonicalArgs.argv[0]).toBe('osascript');
    expect(call.canonicalArgs.argv.join(' ')).toContain('is running');
    expect(call.canonicalArgs.argv.join(' ')).toContain('WINDOW_NOT_FOUND');
  });

  it('rejects linux platform at input validation boundary', () => {
    expect(() =>
      buildWindowFocusToolCall({
        intentId: 'intent-2',
        targetWindow: 'settings',
        platform: 'linux' as never,
        idempotencyKey: 'idem-2',
      }),
    ).toThrow();
  });

  it('rejects omitted platform when host platform is unsupported', async () => {
    await withMockedPlatform('linux', () => {
      expect(() =>
        buildWindowFocusToolCall({
          intentId: 'intent-2b',
          targetWindow: 'settings',
          idempotencyKey: 'idem-2b',
        }),
      ).toThrow('[WINDOW_FOCUS_UNSUPPORTED_PLATFORM]');
    });
  });

  it('maps successful system.run execution to focused=true', async () => {
    const call = buildWindowFocusToolCall({
      intentId: 'intent-3',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-3',
    });

    const result = await runWindowFocusToolCall(call, {
      runSystemRun: vi.fn().mockResolvedValue({
        version: 'v1',
        callId: 'sys-call-1',
        toolName: 'system.run',
        toolVersion: '1.0.0',
        status: 'ok',
        errorClass: 'none',
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        durationMs: 15,
        deltaObserved: true,
        artifacts: {
          stdoutBytes: 2,
          stderrBytes: 0,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      }),
    });

    expect(result.status).toBe('ok');
    expect(result.errorClass).toBe('none');
    expect(result.focused).toBe(true);
    expect(result.systemRunCallId).toBe('sys-call-1');
  });

  it('maps not-found sentinel exit to window_not_found', async () => {
    const call = buildWindowFocusToolCall({
      intentId: 'intent-4',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-4',
    });

    const result = await runWindowFocusToolCall(call, {
      runSystemRun: vi.fn().mockResolvedValue({
        version: 'v1',
        callId: 'sys-call-2',
        toolName: 'system.run',
        toolVersion: '1.0.0',
        status: 'error',
        errorClass: 'non_zero_exit',
        exitCode: 3,
        stdout: '',
        stderr: 'not found',
        durationMs: 20,
        deltaObserved: false,
        artifacts: {
          stdoutBytes: 0,
          stderrBytes: 9,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      }),
    });

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('window_not_found');
    expect(result.focused).toBe(false);
  });

  it('preserves non-sentinel non_zero_exit from focus command', async () => {
    const call = buildWindowFocusToolCall({
      intentId: 'intent-4b',
      targetWindow: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-4b',
    });

    const result = await runWindowFocusToolCall(call, {
      runSystemRun: vi.fn().mockResolvedValue({
        version: 'v1',
        callId: 'sys-call-2b',
        toolName: 'system.run',
        toolVersion: '1.0.0',
        status: 'error',
        errorClass: 'non_zero_exit',
        exitCode: 1,
        stdout: '',
        stderr: 'powershell runtime failure',
        durationMs: 20,
        deltaObserved: false,
        artifacts: {
          stdoutBytes: 0,
          stderrBytes: 25,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      }),
    });

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('non_zero_exit');
    expect(result.focused).toBe(false);
  });

  it('returns validation_error for malformed window.focus call', async () => {
    const result = await runWindowFocusToolCall({} as WindowFocusToolCallV1);

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('validation_error');
    expect(result.focused).toBe(false);
  });
});
