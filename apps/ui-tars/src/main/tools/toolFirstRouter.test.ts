/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import { StatusEnum } from '@ui-tars/shared/types';

import { executeToolFirstRoute } from './toolFirstRouter';

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('toolFirstRouter', () => {
  it('handles app.launch through deterministic tool path', async () => {
    const result = await executeToolFirstRoute(
      {
        sessionId: 'session-1',
        loopCount: 1,
        parsedPrediction: {
          action_type: 'app.launch',
          action_inputs: { content: 'notepad' },
          reflection: null,
          thought: 'launch app',
        },
      },
      {
        runAppLaunch: vi.fn().mockResolvedValue({
          version: 'v1',
          callId: 'call-1',
          toolName: 'app.launch',
          toolVersion: '1.0.0',
          status: 'ok',
          errorClass: 'none',
          launched: true,
          systemRunCallId: 'sys-1',
          stdout: '',
          stderr: '',
          durationMs: 5,
          artifacts: {
            targetApp: 'notepad',
            platform: 'win32',
            stdoutBytes: 0,
            stderrBytes: 0,
            stdoutTruncated: false,
            stderrTruncated: false,
          },
        }),
      },
    );

    expect(result).toEqual({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'app.launch',
      fallbackReason: null,
    });
  });

  it('falls back when window.focus tool returns error', async () => {
    const result = await executeToolFirstRoute(
      {
        sessionId: 'session-2',
        loopCount: 2,
        parsedPrediction: {
          action_type: 'window.focus',
          action_inputs: { content: 'settings' },
          reflection: null,
          thought: 'focus window',
        },
      },
      {
        runWindowFocus: vi.fn().mockResolvedValue({
          version: 'v1',
          callId: 'call-2',
          toolName: 'window.focus',
          toolVersion: '1.0.0',
          status: 'error',
          errorClass: 'non_zero_exit',
          focused: false,
          systemRunCallId: 'sys-2',
          stdout: '',
          stderr: 'failed',
          durationMs: 7,
          artifacts: {
            targetWindow: 'settings',
            platform: 'win32',
            stdoutBytes: 0,
            stderrBytes: 6,
            stdoutTruncated: false,
            stderrTruncated: false,
          },
        }),
      },
    );

    expect(result.handled).toBe(false);
    expect(result.toolName).toBe('window.focus');
    expect(result.fallbackReason).toBe('tool_failed:non_zero_exit');
  });

  it('handles window.wait_ready success through tool path', async () => {
    const result = await executeToolFirstRoute(
      {
        sessionId: 'session-3',
        loopCount: 3,
        parsedPrediction: {
          action_type: 'window.wait_ready',
          action_inputs: { content: 'cursor' },
          reflection: null,
          thought: 'wait ready',
        },
      },
      {
        runWindowWaitReady: vi.fn().mockResolvedValue({
          version: 'v1',
          callId: 'call-3',
          toolName: 'window.wait_ready',
          toolVersion: '1.0.0',
          status: 'ok',
          errorClass: 'none',
          ready: true,
          systemRunCallId: 'sys-3',
          attempts: 1,
          stdout: '',
          stderr: '',
          durationMs: 8,
          artifacts: {
            targetWindow: 'cursor',
            platform: 'win32',
            stdoutBytes: 0,
            stderrBytes: 0,
            stdoutTruncated: false,
            stderrTruncated: false,
          },
        }),
      },
    );

    expect(result).toEqual({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'window.wait_ready',
      fallbackReason: null,
    });
  });

  it('returns unsupported_action_type fallback for non-tool action', async () => {
    const result = await executeToolFirstRoute({
      sessionId: 'session-4',
      parsedPrediction: {
        action_type: 'click',
        action_inputs: { start_box: '[1,1,1,1]' },
        reflection: null,
        thought: 'click',
      },
    });

    expect(result).toEqual({
      handled: false,
      status: StatusEnum.RUNNING,
      toolName: null,
      fallbackReason: 'unsupported_action_type',
    });
  });

  it('keeps idempotency key stable across retries for same tuple', async () => {
    const runAppLaunch = vi.fn().mockResolvedValue({
      version: 'v1',
      callId: 'call-retry',
      toolName: 'app.launch',
      toolVersion: '1.0.0',
      status: 'error',
      errorClass: 'non_zero_exit',
      launched: false,
      systemRunCallId: 'sys-retry',
      stdout: '',
      stderr: 'failed',
      durationMs: 5,
      artifacts: {
        targetApp: 'notepad',
        platform: 'win32',
        stdoutBytes: 0,
        stderrBytes: 6,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });

    const params = {
      sessionId: 'session-retry',
      loopCount: 7,
      parsedPrediction: {
        action_type: 'app.launch',
        action_inputs: { content: 'notepad' },
        reflection: null,
        thought: 'launch app',
      },
    };

    await executeToolFirstRoute(params, { runAppLaunch });
    await executeToolFirstRoute(params, { runAppLaunch });

    const firstIdempotencyKey = runAppLaunch.mock.calls[0]?.[0]?.idempotencyKey;
    const secondIdempotencyKey =
      runAppLaunch.mock.calls[1]?.[0]?.idempotencyKey;

    expect(firstIdempotencyKey).toBe(secondIdempotencyKey);
    expect(firstIdempotencyKey).toBe(
      'tool-first:session-retry:7:app.launch:notepad',
    );
  });
});
